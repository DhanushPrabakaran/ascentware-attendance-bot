import { TurnContext, MessageFactory } from 'botbuilder';
import { AgentApplication, TurnState } from '@microsoft/agents-hosting';
import { Logger } from 'nestjs-pino';
import { CardBuilder } from './cards/CardBuilder';
import { WorkflowEngine } from './workflows/workflow.engine';
import { ActivityTrackerService } from './services/activity-tracker.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AdminService } from '../admin/admin.service';
import { BotHelper } from './BotHelper';

export class TeamsAttendanceBot {
  constructor(
    private readonly workflowEngine: WorkflowEngine,
    private readonly activityTracker: ActivityTrackerService,
    private readonly attendanceService: AttendanceService,
    private readonly adminService: AdminService,
    private readonly logger: Logger,
    private readonly botHelper: BotHelper,
  ) {}

  /**
   * Resolves the Teams user to an existing Employee record. Employees are provisioned by
   * HR/admins, never fabricated here: if a Teams user isn't linked yet, we resolve their
   * verified corporate email via TeamsInfo and link onto a matching existing record
   * (case-insensitive). Only when no matching record exists at all do we create one - and
   * even then it's flagged isProvisional for an admin to reconcile, never silently
   * indistinguishable from an HR-provisioned row. If we can't resolve a verified email at
   * all, we refuse to guess and ask the user to contact an admin instead.
   */
  private async ensureAuthenticated(context: TurnContext): Promise<boolean> {
    const teamsUserId = context.activity.from?.id || '';
    const employee =
      await this.adminService.findEmployeeByTeamsUserId(teamsUserId);
    if (employee) return true;

    const name = context.activity.from?.name || 'Unknown User';
    const resolvedEmail = await this.botHelper.getVerifiedMemberEmail(
      context,
      teamsUserId,
    );

    if (!resolvedEmail) {
      this.logger.error(
        `Could not resolve a verified email for Teams user ${teamsUserId}; refusing to auto-create an employee record.`,
        undefined,
        TeamsAttendanceBot.name,
      );
      await context.sendActivity(
        MessageFactory.text(
          "We couldn't verify your account automatically. Please contact your administrator to get linked.",
        ),
      );
      return false;
    }

    try {
      await this.adminService.findOrLinkEmployeeByVerifiedEmail(
        resolvedEmail,
        teamsUserId,
        name,
      );
      return true;
    } catch (e: any) {
      this.logger.error(
        `Failed to link employee by verified email: ${e.message}`,
        e.stack,
        TeamsAttendanceBot.name,
      );
      await context.sendActivity(
        MessageFactory.text(
          'Error linking your account. Please contact your administrator.',
        ),
      );
      return false;
    }
  }

  public registerHandlers(app: AgentApplication<TurnState>) {
    const handleAction = async (
      context: TurnContext,
      value: any,
      replyToId?: string,
    ) => {
      if (replyToId && this.activityTracker.isConsumed(replyToId)) {
        await context.sendActivity(
          MessageFactory.text('This action has already been completed.'),
        );
        return;
      }

      if (replyToId && this.activityTracker.isProcessing(replyToId)) {
        return;
      }

      if (replyToId) {
        this.activityTracker.startProcessing(replyToId);
      }

      try {
        const handler = this.workflowEngine.getHandlerForAction(value.action);
        const result = await handler.execute(context, value, replyToId);

        if (result.errorMessage) {
          await context.sendActivity(MessageFactory.text(result.errorMessage));
        }

        if (result.activities && result.activities.length > 0) {
          for (const activity of result.activities) {
            const response = await context.sendActivity(activity);
            if (response && response.id && result.setActivities) {
              for (const mapping of result.setActivities) {
                this.activityTracker.setActivity(
                  mapping.actionKey,
                  response.id,
                );
              }
            }
          }
        }

        if (result.deleteReplyToId && replyToId) {
          try {
            await context.deleteActivity(replyToId);
          } catch (e: any) {
            this.logger.error(
              `Failed to delete reply activity: ${e.message}`,
              e.stack,
              TeamsAttendanceBot.name,
            );
          }
        }

        if (result.markConsumed && replyToId) {
          this.activityTracker.markConsumed(replyToId);
        }
        return result;
      } catch (error: any) {
        this.logger.error(
          `Error handling action: ${error.message}`,
          error.stack,
          TeamsAttendanceBot.name,
        );
        let msg = error.message;
        if (
          error.response &&
          error.response.data &&
          error.response.data.error
        ) {
          msg =
            typeof error.response.data.error === 'object'
              ? JSON.stringify(error.response.data.error)
              : error.response.data.error;
        }
        await context.sendActivity(
          MessageFactory.text(`An error occurred: ${msg}`),
        );
      } finally {
        if (replyToId) {
          this.activityTracker.finishProcessing(replyToId);
        }
      }
      return null;
    };

    app.onMessage(/.*/, async (context, state) => {
      if (!(await this.ensureAuthenticated(context as any))) return;

      const userState = await this.attendanceService.getStatus(
        context.activity.from?.id || '',
      );
      const employeeName = context.activity.from?.name || 'Bestie';
      const quote = BotHelper.getRandomQuote();
      let card;

      if (
        userState.status === 'not_checked_in' ||
        userState.status === 'checked_out'
      ) {
        card = CardBuilder.getCheckInCard(employeeName, quote);
      } else if (userState.status === 'on_break') {
        // attendanceId is always set alongside a non-"not_checked_in" status - see AttendanceService.getStatus.
        card = CardBuilder.getOnBreakCard(
          userState.attendanceId!,
          employeeName,
        );
      } else {
        // They are checked_in
        card = CardBuilder.getWorkingCard(
          userState.attendanceId!,
          employeeName,
        );
      }

      const response = await context.sendActivity({
        type: 'message',
        attachments: [card],
      } as any);

      if (response && response.id) {
        this.activityTracker.setActivity('welcome_checkIn', response.id);
        this.activityTracker.setActivity('welcome_applyLeave', response.id);
      }
    });

    app.onActivity('invoke', async (context, state) => {
      if (!(await this.ensureAuthenticated(context as any))) return;

      if (context.activity.name === 'adaptiveCard/action') {
        const payload: any = context.activity.value;
        const data = payload?.action?.data;
        const replyToId = context.activity.replyToId;
        if (data && data.action) {
          await handleAction(context as any, data, replyToId);
          await context.sendActivity({
            type: 'invokeResponse',
            value: { status: 200 },
          } as any);
        }
      }
    });

    app.onActivity('message', async (context, state) => {
      // Only process Adaptive Card submits without text here
      if (!context.activity.text) {
        if (!(await this.ensureAuthenticated(context as any))) return;
        const value: any = context.activity.value;
        const replyToId = context.activity.replyToId;

        if (value && value.action) {
          await handleAction(context as any, value, replyToId);
        }
      }
    });
  }
}

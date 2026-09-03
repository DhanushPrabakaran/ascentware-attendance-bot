import { TurnContext, MessageFactory } from 'botbuilder';
import { AgentApplication, TurnState } from '@microsoft/agents-hosting';
import { CardBuilder } from './cards/CardBuilder';
import { WorkflowEngine } from './workflows/workflow.engine';
import { BackendService } from './services/BackendService';

export class TeamsAttendanceBot {
  public static activityMap: Map<string, string> = new Map();
  public static consumedIds: Set<string> = new Set();
  public static processingIds: Set<string> = new Set();
  private workflowEngine: WorkflowEngine;

  constructor(workflowEngine: WorkflowEngine) {
    this.workflowEngine = workflowEngine;
  }

  public static setActivity(key: string, activityId: string) {
    this.activityMap.set(key, activityId);
  }

  public static getActivity(key: string): string | undefined {
    return this.activityMap.get(key);
  }

  public static markConsumed(activityId: string) {
    this.consumedIds.add(activityId);
  }

  public static isConsumed(activityId: string): boolean {
    return this.consumedIds.has(activityId);
  }

  private async ensureAuthenticated(context: TurnContext): Promise<boolean> {
    const teamsUserId = context.activity.from?.id || '';
    const employee = await BackendService.getEmployeeByTeamsUserId(teamsUserId);

    if (!employee) {
      // The user wants us to use the available details (like aadObjectId and name) 
      // from the Bot Framework payload to automatically link/create the account
      // without ever asking them to type an email.
      const aadObjectId = context.activity.from?.aadObjectId;
      const name = context.activity.from?.name || 'Unknown User';
      
      // Since the database requires an email, we generate a stable internal email
      // using their aadObjectId or teamsUserId.
      const generatedEmail = aadObjectId 
        ? `${aadObjectId}@ascentware.internal` 
        : `${teamsUserId.replace(/[^a-zA-Z0-9]/g, '')}@ascentware.internal`;

      try {
        await BackendService.linkTeamsUserId(generatedEmail, teamsUserId, name);
        
        // Since we did this completely silently and automatically, 
        // we can just return true and let them continue immediately!
        return true;
      } catch (e) {
        console.error('[TeamsBot] Failed to auto-link using internal email', e);
        await context.sendActivity(
          MessageFactory.text("Error automatically linking your account. Please contact your administrator.")
        );
        return false;
      }
    }
    
    return true;
  }

  public registerHandlers(app: AgentApplication<TurnState>) {
    const handleAction = async (
      context: TurnContext,
      value: any,
      replyToId?: string,
    ) => {
      if (replyToId && TeamsAttendanceBot.isConsumed(replyToId)) {
        await context.sendActivity(
          MessageFactory.text('This action has already been completed.'),
        );
        return;
      }

      if (replyToId && TeamsAttendanceBot.processingIds.has(replyToId)) {
        return;
      }

      if (replyToId) {
        TeamsAttendanceBot.processingIds.add(replyToId);
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
                TeamsAttendanceBot.setActivity(mapping.actionKey, response.id);
              }
            }
          }
        }

        if (result.deleteReplyToId && replyToId) {
          try {
            await context.deleteActivity(replyToId);
          } catch (e) {
            console.error(e);
          }
        }

        if (result.markConsumed && replyToId) {
          TeamsAttendanceBot.markConsumed(replyToId);
        }
        return result;
      } catch (error: any) {
        console.error(error);
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
          TeamsAttendanceBot.processingIds.delete(replyToId);
        }
      }
      return null;
    };

    app.onMessage(/.*/, async (context, state) => {
      if (!(await this.ensureAuthenticated(context as any))) return;

      const userState = await BackendService.getStatus(context.activity.from?.id || '');
      let card;

      if (userState.status === 'not_checked_in' || userState.status === 'checked_out') {
        card = CardBuilder.getCheckInCard();
      } else if (userState.status === 'on_break') {
        card = CardBuilder.getOnBreakCard(userState.attendanceId);
      } else {
        // They are checked_in
        card = CardBuilder.getWorkingCard(userState.attendanceId);
      }

      const response = await context.sendActivity({
        type: 'message',
        attachments: [card],
      } as any);

      if (response && response.id) {
        TeamsAttendanceBot.setActivity('welcome_checkIn', response.id);
        TeamsAttendanceBot.setActivity('welcome_applyLeave', response.id);
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

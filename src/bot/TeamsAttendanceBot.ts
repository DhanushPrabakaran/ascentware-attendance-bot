import { TurnContext, MessageFactory, TeamsInfo } from 'botbuilder';
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
      // 1. Attempt to fetch email automatically from Teams
      try {
        const member = await TeamsInfo.getMember(context, teamsUserId);
        const email = member.email || member.userPrincipalName;
        const name = member.name || context.activity.from?.name || email?.split('@')[0];

        if (email) {
          await BackendService.linkTeamsUserId(email, teamsUserId, name);
          return true; // Invisible linking succeeded!
        }
      } catch (e) {
        console.error('[TeamsBot] Failed to auto-fetch member info from Teams', e);
      }

      // 2. Fallback to manual linking if auto-fetch fails
      const text = context.activity.text ? context.activity.text.trim().toLowerCase() : '';
      
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
      const match = emailRegex.exec(text);

      if (match && match[0]) {
        const email = match[0];
        const name = context.activity.from?.name || email.split('@')[0];
        try {
          await BackendService.linkTeamsUserId(email, teamsUserId, name);
          await context.sendActivity(
            MessageFactory.text("Account successfully linked! Type 'hello' to open the menu.")
          );
        } catch (e) {
          await context.sendActivity(
            MessageFactory.text("Error linking account. Please try again or contact your administrator.")
          );
        }
      } else {
        await context.sendActivity(
          MessageFactory.text("Welcome to Ascentware Bot! I don't recognize your Teams account.\nPlease type your official company email address to link your account.")
        );
      }
      return false;
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
        await context.sendActivity(MessageFactory.text(`Error: ${msg}`));
      } finally {
        if (replyToId) {
          TeamsAttendanceBot.processingIds.delete(replyToId);
        }
      }
    };

    app.onMessage('hi', async (context, state) => {
      if (!(await this.ensureAuthenticated(context as any))) return;

      const response = await context.sendActivity({
        type: 'message',
        attachments: [CardBuilder.getCheckInCard()],
      } as any);

      if (response && response.id) {
        TeamsAttendanceBot.setActivity('welcome_checkIn', response.id);
        TeamsAttendanceBot.setActivity('welcome_applyLeave', response.id);
      }
    });

    app.onMessage('hello', async (context, state) => {
      if (!(await this.ensureAuthenticated(context as any))) return;

      const response = await context.sendActivity({
        type: 'message',
        attachments: [CardBuilder.getCheckInCard()],
      } as any);

      if (response && response.id) {
        TeamsAttendanceBot.setActivity('welcome_checkIn', response.id);
        TeamsAttendanceBot.setActivity('welcome_applyLeave', response.id);
      }
    });

    app.onActivity('invoke', async (context, state) => {
      if (!(await this.ensureAuthenticated(context as any))) return;

      if (context.activity.name === 'adaptiveCard/action') {
        const value: any = context.activity.value;
        const replyToId = context.activity.replyToId;
        if (value && value.action) {
          await handleAction(context as any, value, replyToId);
        }
      }
    });

    app.onActivity('message', async (context, state) => {
      if (!(await this.ensureAuthenticated(context as any))) return;

      if (!context.activity.text) {
        const value: any = context.activity.value;
        const replyToId = context.activity.replyToId;

        if (value && value.action) {
          await handleAction(context as any, value, replyToId);
        }
      }
    });
  }
}

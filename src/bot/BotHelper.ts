import { Injectable } from '@nestjs/common';
import { TurnContext, CloudAdapter, Activity } from 'botbuilder';
import { Employee, Leave, LeaveStatus } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class BotHelper {
  constructor(
    private readonly adminService: AdminService,
    private readonly logger: Logger,
  ) {}

  static getRandomQuote(): string {
    const quotes = [
      "No cap, you're gonna crush it today.",
      "Main character energy activated. Let's get this bread.",
      'Time to lock in and secure the bag.',
      'Big brain moves only today.',
      'You passed the vibe check. Have a great shift!',
      'Stay hydrated, stay focused, and pop off today.',
      "We're entering our productive era.",
      "Grind never stops, but don't forget to touch grass later.",
      "W work ethic. Let's go!",
      'Manifesting an easy, breezy workday for you.',
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    return `_"${randomQuote}"_`;
  }

  /**
   * DMs a single Teams user directly (a 1:1 conversation, not the group chat).
   * Extracted from submit-leave.handler.ts, which was the only caller until leave
   * outcome notifications needed the same connectorClient dance.
   */
  async sendDirectMessage(
    context: TurnContext,
    teamsUserId: string,
    activity: Partial<Activity>,
  ): Promise<void> {
    let appId =
      process.env.CLIENT_ID ||
      process.env.CLIENTID ||
      process.env.MicrosoftAppId ||
      '';
    if (!appId && context.activity.recipient?.id) {
      appId = context.activity.recipient.id.replace('28:', '');
    }
    const botRecipient = context.activity.recipient || { id: `28:${appId}` };

    // Find the connector client in the turn state to bypass CloudAdapter scope bugs
    let connectorClient: any;
    for (const val of Array.from((context.turnState as any).values())) {
      if (val && typeof (val as any).createConversation === 'function') {
        connectorClient = val;
        break;
      }
    }

    if (!connectorClient) {
      throw new Error('Could not find ConnectorClient in TurnContext state');
    }

    const conversationResponse = await connectorClient.createConversation({
      isGroup: false,
      bot: botRecipient,
      members: [{ id: teamsUserId }],
      tenantId: context.activity.conversation?.tenantId,
    });

    await connectorClient.sendToConversation(conversationResponse.id, activity);
  }

  /**
   * DMs the applying employee (the outcome-notification gap-fix) and, if they have one
   * assigned, their HR contact - for visibility only, HR never approves. Shared by
   * approve-leave.handler.ts and reject-leave.handler.ts, which differ only in status.
   */
  async notifyLeaveDecision(
    context: TurnContext,
    leave: Leave & { employee: Employee },
    status: LeaveStatus,
  ): Promise<void> {
    const decided = status === LeaveStatus.APPROVED ? 'approved' : 'rejected';
    const emoji = status === LeaveStatus.APPROVED ? '✅' : '❌';
    const dateRange = `${leave.startDate.toDateString()} - ${leave.endDate.toDateString()}`;

    if (leave.employee.teamsUserId) {
      await this.sendDirectMessage(context, leave.employee.teamsUserId, {
        type: 'message',
        text: `${emoji} Your ${leave.leaveType} leave request (${dateRange}) was ${decided}.`,
      });
    }
    if (leave.employee.hrEmail) {
      const hr = await this.adminService.findEmployeeByEmail(
        leave.employee.hrEmail,
      );
      if (hr?.teamsUserId) {
        await this.sendDirectMessage(context, hr.teamsUserId, {
          type: 'message',
          text: `Leave ${decided} for **${leave.employee.name}**: ${leave.leaveType} (${leave.reason})`,
        });
      }
    }
  }

  async notifyGroupChat(context: TurnContext, message: string) {
    try {
      const settings = await this.adminService.getSettings();
      const groupChatId =
        settings.commonGroupId ||
        '19:adc81e9132dd45e6b3dfc769a8b4e2ad@thread.v2';

      const appId =
        process.env.CLIENT_ID ||
        process.env.CLIENTID ||
        process.env.MicrosoftAppId ||
        '';
      const adapter = context.adapter as CloudAdapter;

      const reference: any = TurnContext.getConversationReference(
        context.activity,
      );

      // Override the conversation ID to point to the group chat
      reference.conversation = {
        id: groupChatId,
        isGroup: true,
        conversationType: 'groupChat',
        tenantId: context.activity.conversation?.tenantId,
      };

      // @microsoft/agents-activity reads 'agent' instead of 'bot' for continuation activities
      if (reference.bot) {
        reference.agent = reference.bot;
      }

      // Delete user so we aren't targeting the individual user's thread
      delete reference.user;

      // Bypass TypeScript definitions because @microsoft/agents-hosting's CloudAdapter
      // expects 3 arguments at runtime, but inherits 2-argument typings from botbuilder.
      await (adapter as any).continueConversation(
        appId,
        reference,
        async (tContext: TurnContext) => {
          await tContext.sendActivity(message);
        },
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to notify group chat: ${err.message}`,
        err.stack,
        BotHelper.name,
      );
      try {
        await context.sendActivity(
          `Failed to notify group chat: ${err.message || err.toString()}`,
        );
      } catch (e) {
        // Best-effort: if we can't even tell the user the notification failed, there's nothing more to do.
      }
    }
  }
}

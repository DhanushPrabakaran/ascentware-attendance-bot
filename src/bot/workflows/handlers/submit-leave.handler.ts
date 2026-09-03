import { Injectable } from '@nestjs/common';
import { TurnContext, MessageFactory } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class SubmitLeaveHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const { leaveType, startDate, endDate, reason } = value;

    if (!leaveType || !startDate || !endDate || !reason) {
      return {
        activities: [
          {
            type: 'message',
            attachments: [CardBuilder.getLeaveRequestCard('Please fill all fields to submit a leave request.', value)],
          },
        ],
        deleteReplyToId: true,
        markConsumed: true,
      };
    }

    try {
      const leave = await BackendService.applyLeave(context.activity.from.id, `[${leaveType}] ${startDate} to ${endDate}: ${reason}`);

      // Notify managers
      try {
        const managers = await BackendService.getManagers(context.activity.from.id);
        
        if (managers && managers.length > 0) {
          const appId = process.env.CLIENT_ID || process.env.CLIENTID || process.env.MicrosoftAppId || '';
          const adapter = context.adapter as any;
          const employeeName = context.activity.from.name || 'An employee';

          for (const manager of managers) {
            if (!manager.teamsUserId) continue;

            await adapter.createConversationAsync(
              appId,
              'msteams',
              context.activity.serviceUrl,
              appId,
              {
                isGroup: false,
                agent: context.activity.recipient || { id: `28:${appId}` },
                members: [{ id: manager.teamsUserId }],
                tenantId: context.activity.conversation?.tenantId,
              },
              async (tContext: TurnContext) => {
                await tContext.sendActivity({
                  type: 'message',
                  attachments: [
                    CardBuilder.getLeaveApprovalCard(leave.id, employeeName, leaveType, startDate, endDate, reason)
                  ]
                } as any);
              }
            );
          }
        }
      } catch (err: any) {
        console.error('Failed to notify managers:', err);
        await context.sendActivity(`Failed to notify managers: ${err.message || err.toString()}`);
      }

      return {
        activities: [
          {
            type: 'message',
            attachments: [CardBuilder.getReadOnlyReceiptCard('Leave Submitted', 'Your leave application was submitted successfully. Your manager will be notified.')],
          },
        ],
        deleteReplyToId: true,
        markConsumed: true,
      };
    } catch (e: any) {
      return {
        activities: [
          {
            type: 'message',
            attachments: [CardBuilder.getLeaveRequestCard(e.message, value)],
          },
        ],
        deleteReplyToId: true,
        markConsumed: true,
      };
    }
  }
}

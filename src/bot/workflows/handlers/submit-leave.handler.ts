import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AdminService } from '../../../admin/admin.service';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class SubmitLeaveHandler extends BaseActionHandler {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const { leaveType, startDate, endDate, reason } = value;

    if (!leaveType || !startDate || !endDate || !reason) {
      return this.respond([
        this.cardActivity(
          CardBuilder.getLeaveRequestCard(
            'Please fill all fields to submit a leave request.',
            value,
          ),
        ),
      ]);
    }

    try {
      const leave = await this.adminService.createLeaveForTeamsUser(
        context.activity.from.id,
        {
          leaveType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason,
        },
      );

      // Notify managers
      try {
        const managers = await this.adminService.getManagersForTeamsUser(
          context.activity.from.id,
        );

        if (managers && managers.length > 0) {
          let appId =
            process.env.CLIENT_ID ||
            process.env.CLIENTID ||
            process.env.MicrosoftAppId ||
            '';
          if (!appId && context.activity.recipient?.id) {
            appId = context.activity.recipient.id.replace('28:', '');
          }
          const employeeName = context.activity.from.name || 'An employee';
          const botRecipient = context.activity.recipient || {
            id: `28:${appId}`,
          };

          // Find the connector client in the turn state to bypass CloudAdapter scope bugs
          let connectorClient: any;
          for (const val of Array.from((context.turnState as any).values())) {
            if (val && typeof (val as any).createConversation === 'function') {
              connectorClient = val;
              break;
            }
          }

          if (!connectorClient) {
            throw new Error(
              'Could not find ConnectorClient in TurnContext state',
            );
          }

          for (const manager of managers) {
            if (!manager.teamsUserId) continue;

            const conversationResponse =
              await connectorClient.createConversation({
                isGroup: false,
                bot: botRecipient,
                members: [{ id: manager.teamsUserId }],
                tenantId: context.activity.conversation?.tenantId,
              });

            await connectorClient.sendToConversation(conversationResponse.id, {
              type: 'message',
              attachments: [
                CardBuilder.getLeaveApprovalCard(
                  leave.id,
                  employeeName,
                  leaveType,
                  startDate,
                  endDate,
                  reason,
                ),
              ],
            });
          }
        }
      } catch (err: any) {
        console.error('Failed to notify managers:', err);
        await context.sendActivity(
          `Failed to notify managers: ${err.message || err.toString()}`,
        );
      }

      return this.respond([
        this.cardActivity(
          CardBuilder.getReadOnlyReceiptCard(
            'Leave Submitted',
            'Your leave application was submitted successfully. Your manager will be notified.',
          ),
        ),
      ]);
    } catch (e: any) {
      return this.respond([
        this.cardActivity(CardBuilder.getLeaveRequestCard(e.message, value)),
      ]);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AdminService } from '../../../admin/admin.service';
import { CardBuilder } from '../../cards/CardBuilder';
import { BotHelper } from '../../BotHelper';

@Injectable()
export class SubmitLeaveHandler extends BaseActionHandler {
  constructor(
    private readonly adminService: AdminService,
    private readonly botHelper: BotHelper,
  ) {
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
          const employeeName = context.activity.from.name || 'An employee';

          for (const manager of managers) {
            if (!manager.teamsUserId) continue;
            await this.botHelper.sendDirectMessage(
              context,
              manager.teamsUserId,
              {
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
              },
            );
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

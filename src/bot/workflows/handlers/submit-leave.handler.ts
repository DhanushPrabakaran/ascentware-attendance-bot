import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { Logger } from 'nestjs-pino';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AdminService } from '../../../admin/admin.service';
import { CardBuilder } from '../../cards/CardBuilder';
import { BotHelper } from '../../BotHelper';
import { describeLeavePeriod } from '../../../common/time';

@Injectable()
export class SubmitLeaveHandler extends BaseActionHandler {
  constructor(
    private readonly adminService: AdminService,
    private readonly botHelper: BotHelper,
    private readonly logger: Logger,
  ) {
    super();
  }

  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const { leaveType, startDate, reason } = value;
    const inHours = value.leaveMode === 'hours';
    // Hourly leave is a single day; times are ignored for full-day leave even if filled.
    const endDate = inHours ? startDate : value.endDate;
    const startTime = inHours ? value.startTime : undefined;
    const endTime = inHours ? value.endTime : undefined;

    const missing = inHours
      ? !leaveType || !startDate || !startTime || !endTime || !reason
      : !leaveType || !startDate || !endDate || !reason;
    if (missing) {
      return this.respond([
        this.cardActivity(
          CardBuilder.getLeaveRequestCard(
            inHours
              ? 'For leave in hours, fill in the date, From and To time, and a reason.'
              : 'Please fill in the start and end date and a reason.',
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
          startTime,
          endTime,
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
                    describeLeavePeriod(leave),
                    reason,
                  ),
                ],
              },
            );
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Failed to notify managers: ${err.message}`,
          err.stack,
          SubmitLeaveHandler.name,
        );
        await context.sendActivity(
          `Failed to notify managers: ${err.message || err.toString()}`,
        );
      }

      return this.respond([
        this.cardActivity(
          CardBuilder.getReadOnlyReceiptCard(
            'Leave Submitted',
            `Your ${leaveType} leave for ${describeLeavePeriod(leave)} was submitted. Your manager will be notified.`,
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

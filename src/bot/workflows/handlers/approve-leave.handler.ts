import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { LeaveStatus } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AdminService } from '../../../admin/admin.service';
import { BotHelper } from '../../BotHelper';
import { describeLeavePeriod } from '../../../common/time';

@Injectable()
export class ApproveLeaveHandler extends BaseActionHandler {
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
    const leaveId = value.leaveId;
    const leave = await this.adminService.updateLeaveStatus(
      leaveId,
      LeaveStatus.APPROVED,
    );

    try {
      await this.botHelper.notifyGroupChat(
        context,
        `✅ Leave Request Approved for **${leave.employee.name}**\n${leave.leaveType}: ${describeLeavePeriod(leave)}\n*Reason: ${leave.reason}*`,
        // The approver is the one in this turn - announce to the applicant's groups.
        { id: leave.employeeId },
      );
      await this.botHelper.notifyLeaveDecision(
        context,
        leave,
        LeaveStatus.APPROVED,
      );
    } catch (e: any) {
      this.logger.error(
        `Failed to notify leave approval: ${e.message}`,
        e.stack,
        ApproveLeaveHandler.name,
      );
    }

    return this.respond([
      this.textActivity('Leave request approved successfully.'),
    ]);
  }
}

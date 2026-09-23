import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { LeaveStatus } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AdminService } from '../../../admin/admin.service';
import { BotHelper } from '../../BotHelper';

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
        `✅ Leave Request Approved for **${leave.employee.name}**\n*Reason: ${leave.reason}*`,
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

import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { LeaveStatus } from '@prisma/client';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AdminService } from '../../../admin/admin.service';
import { BotHelper } from '../../BotHelper';

@Injectable()
export class RejectLeaveHandler extends BaseActionHandler {
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
    const leaveId = value.leaveId;
    const leave = await this.adminService.updateLeaveStatus(
      leaveId,
      LeaveStatus.REJECTED,
    );

    try {
      await this.botHelper.notifyLeaveDecision(
        context,
        leave,
        LeaveStatus.REJECTED,
      );
    } catch (e) {
      console.error(e);
    }

    return this.respond([this.textActivity('Leave request rejected.')]);
  }
}

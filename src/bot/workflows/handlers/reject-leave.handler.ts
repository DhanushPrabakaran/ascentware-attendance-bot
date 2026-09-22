import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { LeaveStatus } from '@prisma/client';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AdminService } from '../../../admin/admin.service';

@Injectable()
export class RejectLeaveHandler extends BaseActionHandler {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const leaveId = value.leaveId;
    await this.adminService.updateLeaveStatus(leaveId, LeaveStatus.REJECTED);

    return this.respond([this.textActivity('Leave request rejected.')]);
  }
}

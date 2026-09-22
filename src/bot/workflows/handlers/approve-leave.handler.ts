import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { BotHelper } from '../../BotHelper';

@Injectable()
export class ApproveLeaveHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const leaveId = value.leaveId;
    await BackendService.updateLeaveStatus(leaveId, 'APPROVED');

    try {
      const leave = await BackendService.getLeave(leaveId);
      if (leave && leave.employee) {
        await BotHelper.notifyGroupChat(
          context,
          `✅ Leave Request Approved for **${leave.employee.name}**\n*Reason: ${leave.reason}*`,
        );
      }
    } catch (e) {
      console.error(e);
    }

    return {
      activities: [
        {
          type: 'message',
          text: 'Leave request approved successfully.',
        },
      ],
      deleteReplyToId: true,
      markConsumed: true,
    };
  }
}

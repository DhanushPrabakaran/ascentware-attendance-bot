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
      await BackendService.applyLeave(context.activity.from.id, `[${leaveType}] ${startDate} to ${endDate}: ${reason}`);

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

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
      if (replyToId) {
        await context.updateActivity({
          type: 'message',
          id: replyToId,
          attachments: [CardBuilder.getLeaveRequestCard('Please fill all fields to submit a leave request.', value)],
        } as any);
      }
      return { markConsumed: true };
    }

    try {
      await BackendService.applyLeave(context.activity.from.id, `[${leaveType}] ${startDate} to ${endDate}: ${reason}`);

      if (replyToId) {
        await context.updateActivity({
          type: 'message',
          id: replyToId,
          attachments: [CardBuilder.getReadOnlyReceiptCard('Leave Submitted', 'Your leave application was submitted successfully. Your manager will be notified.')],
        } as any);
      }
      
      return { markConsumed: true };
    } catch (e: any) {
      if (replyToId) {
        await context.updateActivity({
          type: 'message',
          id: replyToId,
          attachments: [CardBuilder.getLeaveRequestCard(e.message, value)],
        } as any);
      }
      return { markConsumed: true };
    }
  }
}

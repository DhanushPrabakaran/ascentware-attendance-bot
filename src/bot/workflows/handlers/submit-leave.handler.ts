import { Injectable } from '@nestjs/common';
import { TurnContext, MessageFactory } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';

@Injectable()
export class SubmitLeaveHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const { startDate, endDate, reason } = value;

    if (!startDate || !endDate || !reason) {
      return {
        errorMessage:
          'Validation Error: Please fill all fields to submit a leave request.',
      };
    }

    try {
      await BackendService.applyLeave(context.activity.from.id, reason);

      const textMessage = MessageFactory.text(
        'Leave application submitted successfully. Your manager will be notified.',
      );
      return {
        activities: [textMessage],
        deleteReplyToId: true,
        markConsumed: true,
      };
    } catch (e: any) {
      return { errorMessage: e.message };
    }
  }
}

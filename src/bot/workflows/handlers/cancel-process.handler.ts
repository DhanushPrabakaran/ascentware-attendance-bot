import { Injectable } from '@nestjs/common';
import { TurnContext, MessageFactory } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';

@Injectable()
export class CancelProcessHandler implements IActionHandler {
  execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    return Promise.resolve({
      activities: [
        {
          type: 'message',
          text: 'Process cancelled.',
        },
      ],
      deleteReplyToId: true,
      markConsumed: true,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { CardBuilder } from '../../cards/CardBuilder';

import { BotHelper } from '../../BotHelper';

@Injectable()
export class CancelLeaveHandler implements IActionHandler {
  execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const employeeName = context.activity.from?.name || 'Bestie';
    const quote = BotHelper.getRandomQuote();
    return Promise.resolve({
      activities: [
        {
          type: 'message',
          attachments: [CardBuilder.getCheckInCard(employeeName, quote)],
        },
      ],
      deleteReplyToId: true,
      markConsumed: true,
    });
  }
}

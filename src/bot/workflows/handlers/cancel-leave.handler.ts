import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class CancelLeaveHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    if (replyToId) {
      await context.updateActivity({
        type: 'message',
        id: replyToId,
        attachments: [CardBuilder.getCheckInCard()],
      } as any);
    }
    return { markConsumed: true };
  }
}

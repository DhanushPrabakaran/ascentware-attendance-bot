import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { CardBuilder } from '../../cards/CardBuilder';
import { BotHelper } from '../../BotHelper';

@Injectable()
export class CancelLeaveHandler extends BaseActionHandler {
  execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const employeeName = context.activity.from?.name || 'Bestie';
    const quote = BotHelper.getRandomQuote();
    return Promise.resolve(
      this.respond([
        this.cardActivity(CardBuilder.getCheckInCard(employeeName, quote)),
      ]),
    );
  }
}

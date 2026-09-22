import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class ApplyLeaveHandler extends BaseActionHandler {
  execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    return Promise.resolve(
      this.respond([this.cardActivity(CardBuilder.getLeaveRequestCard())]),
    );
  }
}

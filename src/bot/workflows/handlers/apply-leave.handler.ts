import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class ApplyLeaveHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    return {
      activities: [
        {
          type: 'message',
          attachments: [CardBuilder.getLeaveRequestCard()],
        },
      ],
    };
  }
}

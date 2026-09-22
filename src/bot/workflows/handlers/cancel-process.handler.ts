import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';

@Injectable()
export class CancelProcessHandler extends BaseActionHandler {
  execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    return Promise.resolve(
      this.respond([this.textActivity('Process cancelled.')]),
    );
  }
}

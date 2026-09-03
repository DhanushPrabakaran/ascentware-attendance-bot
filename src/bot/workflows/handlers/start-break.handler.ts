import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { CardBuilder } from '../../cards/CardBuilder';
import { BotHelper } from '../../BotHelper';

@Injectable()
export class StartBreakHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    await BackendService.startBreak(value.attendanceId);
    
    const employeeName = context.activity.from.name || 'An employee';
    await BotHelper.notifyGroupChat(context, `☕ **${employeeName}** is taking a break.`);

    return {
      activities: [
        {
          type: 'message',
          attachments: [
            CardBuilder.getReadOnlyReceiptCard(
              'Break Started',
              'Have a good rest!',
            ),
          ],
        },
        {
          type: 'message',
          attachments: [CardBuilder.getOnBreakCard(value.attendanceId, employeeName)],
        },
      ],
      deleteReplyToId: true,
      markConsumed: true,
      setActivities: [
        { actionKey: value.attendanceId + '_endBreak', activityId: '' },
      ],
    };
  }
}

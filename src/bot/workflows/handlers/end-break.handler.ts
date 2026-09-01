import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class EndBreakHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    await BackendService.endBreak(value.attendanceId);

    return {
      activities: [
        {
          type: 'message',
          attachments: [
            CardBuilder.getReadOnlyReceiptCard('Break Ended', 'Back to work!'),
          ],
        },
        {
          type: 'message',
          attachments: [CardBuilder.getWorkingCard(value.attendanceId)],
        },
      ],
      deleteReplyToId: true,
      markConsumed: true,
      setActivities: [
        { actionKey: value.attendanceId + '_startBreak', activityId: '' },
        { actionKey: value.attendanceId + '_checkOut', activityId: '' },
      ],
    };
  }
}

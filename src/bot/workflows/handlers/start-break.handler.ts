import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class StartBreakHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    await BackendService.startBreak(value.attendanceId);

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
          attachments: [CardBuilder.getOnBreakCard(value.attendanceId)],
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

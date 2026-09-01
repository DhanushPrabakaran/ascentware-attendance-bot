import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { CardBuilder } from '../../cards/CardBuilder';
import { ReviewTasksCard } from '../../cards/ReviewTasksCard';

@Injectable()
export class CheckOutHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const tasks = await BackendService.getTasks(value.attendanceId);

    return {
      activities: [
        {
          type: 'message',
          attachments: [
            CardBuilder.getReadOnlyReceiptCard(
              'Reviewing Day',
              'Initiating checkout process...',
            ),
          ],
        },
        {
          type: 'message',
          attachments: [ReviewTasksCard.getCard(value.attendanceId, tasks)],
        },
      ],
      deleteReplyToId: true,
      markConsumed: true,
      setActivities: [
        { actionKey: value.attendanceId + '_submitReview', activityId: '' },
      ],
    };
  }
}

import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class CancelPlanTasksHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    return {
      activities: [
        {
          type: 'message',
          attachments: [
            CardBuilder.getReadOnlyReceiptCard(
              'Planning Skipped',
              'You have skipped task planning for today.',
            ),
          ],
        },
        {
          type: 'message',
          attachments: [CardBuilder.getWorkingCard(value.attendanceId, context.activity.from?.name || 'Bestie')],
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

import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class CancelPlanTasksHandler extends BaseActionHandler {
  execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    return Promise.resolve(
      this.respond(
        [
          this.cardActivity(
            CardBuilder.getReadOnlyReceiptCard(
              'Planning Skipped',
              'You have skipped task planning for today.',
            ),
          ),
          this.cardActivity(
            CardBuilder.getWorkingCard(
              value.attendanceId,
              context.activity.from?.name || 'Bestie',
            ),
          ),
        ],
        {
          setActivities: [
            { actionKey: value.attendanceId + '_startBreak', activityId: '' },
            { actionKey: value.attendanceId + '_checkOut', activityId: '' },
          ],
        },
      ),
    );
  }
}

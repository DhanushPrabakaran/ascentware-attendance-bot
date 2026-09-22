import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { WorkPlanService } from '../../../work-plan/work-plan.service';
import { CardBuilder } from '../../cards/CardBuilder';
import { ReviewTasksCard } from '../../cards/ReviewTasksCard';

@Injectable()
export class CheckOutHandler extends BaseActionHandler {
  constructor(private readonly workPlanService: WorkPlanService) {
    super();
  }

  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const tasks = await this.workPlanService.getTasksByAttendanceId(
      value.attendanceId,
    );

    return this.respond(
      [
        this.cardActivity(
          CardBuilder.getReadOnlyReceiptCard(
            'Reviewing Day',
            'Initiating checkout process...',
          ),
        ),
        this.cardActivity(ReviewTasksCard.getCard(value.attendanceId, tasks)),
      ],
      {
        setActivities: [
          { actionKey: value.attendanceId + '_submitReview', activityId: '' },
        ],
      },
    );
  }
}

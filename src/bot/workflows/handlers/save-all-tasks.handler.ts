import { Injectable } from '@nestjs/common';
import { TurnContext, MessageFactory } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { WorkPlanService } from '../../../work-plan/work-plan.service';
import { CardBuilder } from '../../cards/CardBuilder';
import { PlanTasksCard } from '../../cards/PlanTasksCard';

@Injectable()
export class SaveAllTasksHandler extends BaseActionHandler {
  constructor(private readonly workPlanService: WorkPlanService) {
    super();
  }

  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const tasks = [];
    let totalEstimatedMinutes = 0;

    for (let i = 1; i <= 5; i++) {
      const tName = value[`taskName_${i}`];
      if (tName && tName.trim() !== '') {
        const estimatedMinutes =
          parseInt(value[`estimatedMinutes_${i}`], 10) || 0;
        totalEstimatedMinutes += estimatedMinutes;

        tasks.push({
          taskName: tName,
          priority: value[`priority_${i}`],
          estimatedMinutes: estimatedMinutes,
        });
      }
    }

    const permissionMinutes = parseInt(value.permissionMinutes, 10) || 0;

    if (tasks.length === 0 && permissionMinutes === 0) {
      const errorMsg = `You must provide at least one task or permission.`;
      return this.respond(
        [
          MessageFactory.text(`Validation Error: ${errorMsg}`),
          this.cardActivity(
            PlanTasksCard.getCard(value.attendanceId, errorMsg, value),
          ),
        ],
        {
          setActivities: [
            { actionKey: value.attendanceId + '_saveAllTasks', activityId: '' },
          ],
        },
      );
    }

    await this.workPlanService.saveDailyPlan(
      value.attendanceId,
      tasks,
      permissionMinutes,
    );

    return this.respond(
      [
        this.cardActivity(
          CardBuilder.getReadOnlyReceiptCard(
            'Day Planned',
            `Saved ${tasks.length} tasks and ${permissionMinutes} mins of leave.`,
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
    );
  }
}

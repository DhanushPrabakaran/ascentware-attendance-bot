import { Injectable } from '@nestjs/common';
import { TurnContext, MessageFactory } from 'botbuilder';
import { Logger } from 'nestjs-pino';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { WorkPlanService } from '../../../work-plan/work-plan.service';
import { CardBuilder } from '../../cards/CardBuilder';
import { PlanTasksCard } from '../../cards/PlanTasksCard';
import { PlanSummaryCard } from '../../cards/PlanSummaryCard';
import { BotHelper } from '../../BotHelper';
import { formatDuration } from '../../../common/time';

@Injectable()
export class SaveAllTasksHandler extends BaseActionHandler {
  constructor(
    private readonly workPlanService: WorkPlanService,
    private readonly botHelper: BotHelper,
    private readonly logger: Logger,
  ) {
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

    // Saving again from "Add / Edit Plan" replaces the plan - label the group post so.
    const hadPlan =
      (await this.workPlanService.getTasksByAttendanceId(value.attendanceId))
        .length > 0;

    await this.workPlanService.saveDailyPlan(
      value.attendanceId,
      tasks,
      permissionMinutes,
    );

    const employeeName = context.activity.from?.name || 'An employee';
    try {
      await this.botHelper.notifyGroupChat(context, {
        type: 'message',
        attachments: [
          PlanSummaryCard.getCard(employeeName, tasks, {
            permissionMinutes,
            updated: hadPlan,
          }),
        ],
      });
    } catch (e: any) {
      // The plan is saved either way - a failed group post shouldn't block the user.
      this.logger.error(
        `Failed to post plan to group: ${e.message}`,
        e.stack,
        SaveAllTasksHandler.name,
      );
    }

    return this.respond(
      [
        this.cardActivity(
          CardBuilder.getReadOnlyReceiptCard(
            'Day Planned',
            permissionMinutes > 0
              ? `Saved ${tasks.length} task(s) and ${formatDuration(permissionMinutes)} of permission. Your plan was shared with your team.`
              : `Saved ${tasks.length} task(s). Your plan was shared with your team.`,
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

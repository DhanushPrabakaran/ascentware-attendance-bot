import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { WorkPlanService } from '../../../work-plan/work-plan.service';
import { AttendanceService } from '../../../attendance/attendance.service';
import { PlanTasksCard } from '../../cards/PlanTasksCard';

@Injectable()
export class EditPlanHandler extends BaseActionHandler {
  constructor(
    private readonly workPlanService: WorkPlanService,
    private readonly attendanceService: AttendanceService,
  ) {
    super();
  }

  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const attendanceId = value.attendanceId;

    const existingTasks =
      await this.workPlanService.getTasksByAttendanceId(attendanceId);

    const previousValues: any = {};
    existingTasks.forEach((task, index) => {
      const i = index + 1;
      if (i > 5) return; // Adaptive card supports up to 5 tasks
      previousValues[`taskName_${i}`] = task.taskName;
      previousValues[`priority_${i}`] = task.priority;
      previousValues[`estimatedMinutes_${i}`] =
        task.estimatedMinutes.toString();
    });

    const attendance = await this.attendanceService.findById(attendanceId);
    if (attendance) {
      previousValues['permissionMinutes'] =
        attendance.permissionMinutes.toString();
    }

    return this.respond(
      [
        this.cardActivity(
          PlanTasksCard.getCard(attendanceId, undefined, previousValues),
        ),
      ],
      {
        setActivities: [
          { actionKey: attendanceId + '_saveAllTasks', activityId: '' },
          { actionKey: attendanceId + '_cancelPlanTasks', activityId: '' },
        ],
      },
    );
  }
}

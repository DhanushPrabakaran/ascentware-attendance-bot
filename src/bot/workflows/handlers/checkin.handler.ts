import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AttendanceService } from '../../../attendance/attendance.service';
import { WorkPlanService } from '../../../work-plan/work-plan.service';
import { MAX_PLAN_TASKS, PlanTasksCard } from '../../cards/PlanTasksCard';
import { BotHelper } from '../../BotHelper';
import { APP_TIMEZONE } from '../../../common/time';

@Injectable()
export class CheckInHandler extends BaseActionHandler {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly botHelper: BotHelper,
    private readonly workPlanService: WorkPlanService,
  ) {
    super();
  }

  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const attendance = await this.attendanceService.checkIn(
      context.activity.from.id,
    );
    const employeeName = context.activity.from.name || 'An employee';
    await this.botHelper.notifyGroupChat(
      context,
      `✅ **${employeeName}** has just checked in for the day.`,
    );

    const permissionMinutes =
      await this.attendanceService.getApprovedPermissionMinutesToday(
        context.activity.from.id,
      );

    const previousValues: Record<string, string> = {};
    if (permissionMinutes > 0) {
      previousValues.permissionMinutes = String(permissionMinutes);
    }

    // Pre-fill whatever was left unfinished last working day.
    let notice: string | undefined;
    const carried = await this.workPlanService.getUnfinishedTasksFromLastDay(
      attendance.employeeId,
      attendance.id,
    );
    if (carried) {
      const tasks = carried.tasks.slice(0, MAX_PLAN_TASKS);
      tasks.forEach((task, index) => {
        const i = index + 1;
        previousValues[`taskName_${i}`] = task.taskName;
        previousValues[`priority_${i}`] = task.priority;
        if (task.estimatedMinutes > 0) {
          previousValues[`estimatedMinutes_${i}`] = String(
            task.estimatedMinutes,
          );
        }
      });
      const day = carried.date.toLocaleDateString('en-GB', {
        weekday: 'long',
        timeZone: APP_TIMEZONE,
      });
      notice = `↪️ Carried over ${tasks.length} unfinished task(s) from ${day}. Remove any you don't need.`;
    }

    return this.respond(
      [
        this.cardActivity(
          PlanTasksCard.getCard(
            attendance.id,
            undefined,
            Object.keys(previousValues).length > 0 ? previousValues : undefined,
            notice,
          ),
        ),
      ],
      {
        setActivities: [
          { actionKey: attendance.id + '_saveAllTasks', activityId: '' },
          { actionKey: attendance.id + '_cancelPlanTasks', activityId: '' },
        ],
      },
    );
  }
}

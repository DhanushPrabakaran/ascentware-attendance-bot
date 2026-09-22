import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AttendanceService } from '../../../attendance/attendance.service';
import { PlanTasksCard } from '../../cards/PlanTasksCard';
import { BotHelper } from '../../BotHelper';

@Injectable()
export class CheckInHandler extends BaseActionHandler {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly botHelper: BotHelper,
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

    return this.respond(
      [this.cardActivity(PlanTasksCard.getCard(attendance.id))],
      {
        setActivities: [
          { actionKey: attendance.id + '_saveAllTasks', activityId: '' },
          { actionKey: attendance.id + '_cancelPlanTasks', activityId: '' },
        ],
      },
    );
  }
}

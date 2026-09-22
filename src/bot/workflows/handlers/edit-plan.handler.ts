import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { PlanTasksCard } from '../../cards/PlanTasksCard';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EditPlanHandler implements IActionHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const attendanceId = value.attendanceId;

    const existingTasks = await this.prisma.dailyTask.findMany({
      where: { attendanceId },
      orderBy: { id: 'asc' },
    });

    const previousValues: any = {};
    existingTasks.forEach((task, index) => {
      const i = index + 1;
      if (i > 5) return; // Adaptive card supports up to 5 tasks
      previousValues[`taskName_${i}`] = task.taskName;
      previousValues[`priority_${i}`] = task.priority;
      previousValues[`estimatedMinutes_${i}`] =
        task.estimatedMinutes.toString();
    });

    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });
    if (attendance) {
      previousValues['permissionMinutes'] =
        attendance.permissionMinutes.toString();
    }

    return {
      activities: [
        {
          type: 'message',
          attachments: [
            PlanTasksCard.getCard(attendanceId, undefined, previousValues),
          ],
        },
      ],
      deleteReplyToId: true,
      markConsumed: true,
      setActivities: [
        { actionKey: attendanceId + '_saveAllTasks', activityId: '' },
        { actionKey: attendanceId + '_cancelPlanTasks', activityId: '' },
      ],
    };
  }
}

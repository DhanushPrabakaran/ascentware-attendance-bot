import { Injectable } from '@nestjs/common';
import { TurnContext, MessageFactory } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { CardBuilder } from '../../cards/CardBuilder';
import { PlanTasksCard } from '../../cards/PlanTasksCard';

@Injectable()
export class SaveAllTasksHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const tasks = [];
    let totalEstimatedMinutes = 0;

    for (let i = 0; i < 5; i++) {
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
    const grandTotal = totalEstimatedMinutes + permissionMinutes;

    // Validation removed as per user request
    if (tasks.length === 0 && permissionMinutes === 0) {
      const errorMsg = `You must provide at least one task or permission.`;
      const validationErrorText = MessageFactory.text(`Validation Error: ${errorMsg}`);
      return {
        activities: [
          validationErrorText,
          {
            type: 'message',
            attachments: [
              PlanTasksCard.getCard(value.attendanceId, errorMsg, value),
            ],
          },
        ],
        deleteReplyToId: true,
        markConsumed: true,
        setActivities: [
          { actionKey: value.attendanceId + '_saveAllTasks', activityId: '' },
        ],
      };
    }

    if (tasks.length > 0 || permissionMinutes > 0) {
      await BackendService.saveWorkPlan(
        value.attendanceId,
        tasks,
        permissionMinutes,
      );
    }

    return {
      activities: [
        {
          type: 'message',
          attachments: [
            CardBuilder.getReadOnlyReceiptCard(
              'Day Planned',
              `Saved ${tasks.length} tasks and ${permissionMinutes} mins of leave.`,
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

import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { CardBuilder } from '../../cards/CardBuilder';
import { PlanTasksCard } from '../../cards/PlanTasksCard';
import { BotHelper } from '../../BotHelper';

@Injectable()
export class CheckInHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const isLate = value.isLate === 'true';
    const reason = value.reason || '';

    const attendance = await BackendService.checkIn(context.activity.from.id);
    const employeeName = context.activity.from.name || 'An employee';
    await BotHelper.notifyGroupChat(context, `✅ **${employeeName}** has just checked in for the day.`);

    const attachment = PlanTasksCard.getCard(attendance.id);
    const result: HandlerResult = {
      activities: [
        {
          type: 'message',
          attachments: [attachment],
        },
      ],
      deleteReplyToId: true,
      markConsumed: true,
      setActivities: [
        { actionKey: attendance.id + '_saveAllTasks', activityId: '' },
        { actionKey: attendance.id + '_cancelPlanTasks', activityId: '' },
      ],
    };
    return result;
  }
}

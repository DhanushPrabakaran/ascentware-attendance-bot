import { Injectable } from '@nestjs/common';
import { TurnContext, MessageFactory } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { CardBuilder } from '../../cards/CardBuilder';

@Injectable()
export class SubmitReviewHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const tasksToUpdate = [];
    for (const key of Object.keys(value)) {
      if (key.startsWith('status_')) {
        const taskId = key.replace('status_', '');
        tasksToUpdate.push({
          id: taskId,
          status: value[key],
          timeTakenMinutes: value[`timeTaken_${taskId}`],
          remarks: value[`remarks_${taskId}`] || '',
        });
      }
    }

    if (tasksToUpdate.length > 0) {
      await BackendService.bulkUpdateTasks(tasksToUpdate);
    }

    const result = await BackendService.checkOut(value.attendanceId);

    const checkedOutMessage = MessageFactory.text(
      'You are checked out for the day. See you tomorrow!',
    );

    return {
      activities: [
        {
          type: 'message',
          attachments: [
            CardBuilder.getReadOnlyReceiptCard(
              'Checked Out',
              `Working Time: ${result.workingMinutes} mins, Break Time: ${result.breakMinutes} mins`,
            ),
          ],
        },
        checkedOutMessage,
      ],
      deleteReplyToId: true,
      markConsumed: true,
    };
  }
}

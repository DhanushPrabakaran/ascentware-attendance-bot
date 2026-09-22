import { Injectable } from '@nestjs/common';
import { TurnContext, MessageFactory } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { WorkPlanService } from '../../../work-plan/work-plan.service';
import { AttendanceService } from '../../../attendance/attendance.service';
import { CardBuilder } from '../../cards/CardBuilder';
import { BotHelper } from '../../BotHelper';

@Injectable()
export class SubmitReviewHandler extends BaseActionHandler {
  constructor(
    private readonly workPlanService: WorkPlanService,
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
      await this.workPlanService.bulkUpdateTaskProgress(tasksToUpdate);
    }

    const result = await this.attendanceService.checkOut(value.attendanceId);

    const employeeName = context.activity.from.name || 'An employee';
    await this.botHelper.notifyGroupChat(
      context,
      `👋 **${employeeName}** has checked out for the day.\n*Working Time: ${result.workingMinutes} mins | Break Time: ${result.breakMinutes} mins*`,
    );

    return this.respond([
      this.cardActivity(
        CardBuilder.getReadOnlyReceiptCard(
          'Checked Out',
          `Working Time: ${result.workingMinutes} mins, Break Time: ${result.breakMinutes} mins`,
        ),
      ),
      MessageFactory.text('You are checked out for the day. See you tomorrow!'),
    ]);
  }
}

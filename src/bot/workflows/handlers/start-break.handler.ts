import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AttendanceService } from '../../../attendance/attendance.service';
import { CardBuilder } from '../../cards/CardBuilder';
import { BotHelper } from '../../BotHelper';

@Injectable()
export class StartBreakHandler extends BaseActionHandler {
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
    await this.attendanceService.startBreak(value.attendanceId);

    const employeeName = context.activity.from.name || 'An employee';
    await this.botHelper.notifyGroupChat(
      context,
      `☕ **${employeeName}** is taking a break.`,
    );

    return this.respond(
      [
        this.cardActivity(
          CardBuilder.getReadOnlyReceiptCard(
            'Break Started',
            'Have a good rest!',
          ),
        ),
        this.cardActivity(
          CardBuilder.getOnBreakCard(value.attendanceId, employeeName),
        ),
      ],
      {
        setActivities: [
          { actionKey: value.attendanceId + '_endBreak', activityId: '' },
        ],
      },
    );
  }
}

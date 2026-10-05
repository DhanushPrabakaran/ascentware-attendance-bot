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
    const breakType = value.breakType === 'lunch' ? 'lunch' : 'break';
    await this.attendanceService.startBreak(value.attendanceId, breakType);

    const employeeName = context.activity.from.name || 'An employee';
    await this.botHelper.notifyGroupChat(
      context,
      breakType === 'lunch'
        ? `🍱 **${employeeName}** is out for lunch.`
        : `☕ **${employeeName}** is taking a break.`,
    );

    return this.respond(
      [
        this.cardActivity(
          CardBuilder.getReadOnlyReceiptCard(
            breakType === 'lunch' ? 'Lunch Started' : 'Break Started',
            breakType === 'lunch' ? 'Enjoy your meal!' : 'Have a good rest!',
          ),
        ),
        this.cardActivity(
          CardBuilder.getOnBreakCard(
            value.attendanceId,
            employeeName,
            breakType,
          ),
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

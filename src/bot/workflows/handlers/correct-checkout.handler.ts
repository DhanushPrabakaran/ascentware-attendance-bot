import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import { HandlerResult } from '../interfaces/action-handler.interface';
import { BaseActionHandler } from './base-action.handler';
import { AttendanceService } from '../../../attendance/attendance.service';
import { AdminService } from '../../../admin/admin.service';
import { CardBuilder } from '../../cards/CardBuilder';
import { formatClock, formatDay, formatDuration } from '../../../common/time';

/** The employee's answer to the "you didn't check out" notice (SchedulerService). */
@Injectable()
export class CorrectCheckOutHandler extends BaseActionHandler {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly adminService: AdminService,
  ) {
    super();
  }

  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const attendance = await this.attendanceService.findById(
      value.attendanceId,
    );
    const employee = await this.adminService.findEmployeeByTeamsUserId(
      context.activity.from.id,
    );
    if (!attendance || !employee || attendance.employeeId !== employee.id) {
      return this.respond([
        this.textActivity("That check-out isn't yours to change."),
      ]);
    }
    if (!attendance.autoCheckedOut) {
      return this.respond([
        this.textActivity('That check-out has already been corrected.'),
      ]);
    }

    const retry = (error: string) =>
      this.respond(
        [
          this.cardActivity(
            CardBuilder.getAutoCheckOutNoticeCard(
              attendance.id,
              formatDay(attendance.checkIn),
              attendance.checkOut
                ? formatClock(attendance.checkOut)
                : 'midnight',
              formatDuration(attendance.workingMinutes),
              error,
            ),
          ),
        ],
        { markConsumed: false },
      );

    if (!value.checkOutTime) return retry('Please enter a time.');
    try {
      const updated = await this.attendanceService.correctCheckOut(
        attendance.id,
        String(value.checkOutTime).slice(0, 5),
      );
      return this.respond([
        this.cardActivity(
          CardBuilder.getReadOnlyReceiptCard(
            'Check-out Updated',
            `${formatDay(updated.checkIn)}: ${formatClock(updated.checkIn)}–${formatClock(updated.checkOut!)}, ${formatDuration(updated.workingMinutes)} worked.`,
          ),
        ),
      ]);
    } catch (e: any) {
      return retry(e.message);
    }
  }
}

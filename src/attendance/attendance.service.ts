import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calendarDateOf, nextMidnight, startOfDay } from '../common/time';

export type BreakType = 'break' | 'lunch';
const OPEN_STATUSES = ['checked_in', 'on_break'];

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async findById(attendanceId: string) {
    return this.prisma.attendance.findUnique({ where: { id: attendanceId } });
  }

  async getStatus(teamsUserId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { teamsUserId },
    });
    if (!employee)
      return { status: 'not_checked_in', employeeId: null, attendanceId: null };

    // Close anything left open from a previous day before deciding today's state.
    await this.autoCheckOutStale(new Date(), employee.id);

    // "Today" in the company timezone, not the server's (UTC on Render).
    const today = startOfDay(new Date());

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        checkIn: { gte: today },
      },
      orderBy: { checkIn: 'desc' },
    });

    if (!attendance) {
      return {
        status: 'not_checked_in',
        employeeId: employee.id,
        attendanceId: null,
      };
    }

    return {
      status: attendance.status,
      employeeId: employee.id,
      attendanceId: attendance.id,
    };
  }

  async checkIn(teamsUserId: string) {
    // Employees are provisioned by HR/admins (or linked via the bot's verified-email
    // flow) - never fabricated here. See TeamsAttendanceBot.ensureAuthenticated().
    const employee = await this.prisma.employee.findUnique({
      where: { teamsUserId },
    });
    if (!employee) {
      throw new NotFoundException(
        'No employee is linked to this Teams user yet. Contact an administrator.',
      );
    }

    await this.autoCheckOutStale(new Date(), employee.id);

    return this.prisma.attendance.create({
      data: {
        employeeId: employee.id,
        checkIn: new Date(),
        status: 'checked_in',
      },
    });
  }

  async checkOut(attendanceId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { breaks: true },
    });
    if (!attendance) throw new BadRequestException('Attendance not found');
    if (attendance.status === 'checked_out')
      throw new BadRequestException('Already checked out');

    const checkOutTime = new Date();
    let totalBreakMinutes = 0;
    attendance.breaks.forEach((b) => {
      totalBreakMinutes += b.duration;
    });

    const checkInTime = new Date(attendance.checkIn);
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const workingMinutes = Math.floor(diffMs / 60000) - totalBreakMinutes;

    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkOut: checkOutTime,
        status: 'checked_out',
        workingMinutes,
        breakMinutes: totalBreakMinutes,
      },
    });
  }

  /**
   * Closes every session still open from a previous day (in the company timezone) at
   * the midnight that ended its day - so the stored check-out is the same whenever
   * this runs: from the periodic AutoCheckoutService sweep, or lazily from
   * getStatus/checkIn if the server was asleep at midnight (Render free tier). An open
   * break is closed at that midnight too. Returns how many sessions were closed.
   */
  async autoCheckOutStale(now = new Date(), employeeId?: string) {
    const stale = await this.prisma.attendance.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        checkIn: { lt: startOfDay(now) },
        ...(employeeId ? { employeeId } : {}),
      },
      include: { breaks: true },
    });

    let closed = 0;
    for (const attendance of stale) {
      const cutoff = nextMidnight(attendance.checkIn);
      let breakMinutes = 0;
      const openBreaks = attendance.breaks.filter((b) => !b.breakEnd);
      for (const b of attendance.breaks) {
        breakMinutes += b.breakEnd
          ? b.duration
          : minutesBetween(b.breakStart, cutoff);
      }
      const workingMinutes = Math.max(
        0,
        minutesBetween(attendance.checkIn, cutoff) - breakMinutes,
      );

      const updated = await this.prisma.$transaction(async (tx) => {
        // Guarded on status so a manual check-out racing this sweep wins cleanly.
        const result = await tx.attendance.updateMany({
          where: { id: attendance.id, status: { in: OPEN_STATUSES } },
          data: {
            checkOut: cutoff,
            status: 'checked_out',
            autoCheckedOut: true,
            workingMinutes,
            breakMinutes,
          },
        });
        if (result.count === 0) return false;
        for (const b of openBreaks) {
          await tx.attendanceBreak.update({
            where: { id: b.id },
            data: {
              breakEnd: cutoff,
              duration: minutesBetween(b.breakStart, cutoff),
            },
          });
        }
        return true;
      });
      if (updated) closed++;
    }
    return closed;
  }

  /** Total approved hourly leave ("permission") the employee has today - pre-fills the
   *  check-in plan card's permission question. */
  async getApprovedPermissionMinutesToday(teamsUserId: string) {
    const leaves = await this.prisma.leave.findMany({
      where: {
        employee: { teamsUserId },
        status: 'APPROVED',
        startDate: calendarDateOf(new Date()),
        durationMinutes: { not: null },
      },
      select: { durationMinutes: true },
    });
    return leaves.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
  }

  async getOpenBreak(attendanceId: string) {
    return this.prisma.attendanceBreak.findFirst({
      where: { attendanceId, breakEnd: null },
      orderBy: { breakStart: 'desc' },
    });
  }

  async startBreak(attendanceId: string, type: BreakType = 'break') {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });
    if (!attendance) throw new BadRequestException('Attendance not found');
    if (attendance.status !== 'checked_in')
      throw new BadRequestException('Cannot start break from current status');

    await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: { status: 'on_break' },
    });

    return this.prisma.attendanceBreak.create({
      data: {
        attendanceId,
        breakStart: new Date(),
        type,
      },
    });
  }

  async endBreak(attendanceId: string) {
    const breakRecord = await this.prisma.attendanceBreak.findFirst({
      where: {
        attendanceId,
        breakEnd: null,
      },
      orderBy: { breakStart: 'desc' },
    });

    if (!breakRecord) throw new BadRequestException('Break record not found');
    if (breakRecord.breakEnd)
      throw new BadRequestException('Break already ended');

    const breakEnd = new Date();
    const duration = minutesBetween(breakRecord.breakStart, breakEnd);

    const updatedBreak = await this.prisma.attendanceBreak.update({
      where: { id: breakRecord.id },
      data: {
        breakEnd,
        duration,
      },
    });

    await this.prisma.attendance.update({
      where: { id: breakRecord.attendanceId },
      data: { status: 'checked_in' },
    });

    return updatedBreak;
  }
}

function minutesBetween(from: Date, to: Date) {
  return Math.max(
    0,
    Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000),
  );
}

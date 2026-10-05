import { Injectable } from '@nestjs/common';
import { LeaveStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TASK_ORDER } from '../../work-plan/work-plan.service';
import { calendarDateOf, formatClock, startOfDay } from '../../common/time';
import { MemberDay } from '../cards/DigestCard';

/** Builds each person's day (attendance, approved leave, tasks) for the digests. */
@Injectable()
export class TeamDayService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberDays(
    members: { id: string; name: string }[],
    now = new Date(),
  ): Promise<MemberDay[]> {
    const ids = members.map((m) => m.id);
    const today = calendarDateOf(now);
    const [attendances, leaves] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { employeeId: { in: ids }, checkIn: { gte: startOfDay(now) } },
        include: { dailyTasks: { orderBy: TASK_ORDER } },
        orderBy: { checkIn: 'desc' },
      }),
      this.prisma.leave.findMany({
        where: {
          employeeId: { in: ids },
          status: LeaveStatus.APPROVED,
          startDate: { lte: today },
          endDate: { gte: today },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    return members.map((member) => {
      // Latest session of the day wins if someone checked in twice.
      const attendance = attendances.find((a) => a.employeeId === member.id);
      const memberLeaves = leaves.filter((l) => l.employeeId === member.id);
      const fullDay = memberLeaves.some((l) => l.durationMinutes == null);
      const leave = memberLeaves
        .map((l) =>
          l.startTime && l.endTime
            ? `${l.leaveType === 'Permission' ? 'Permission' : `${l.leaveType} leave`} ${l.startTime}–${l.endTime}`
            : `${l.leaveType} leave`,
        )
        .join(', ');

      const tasks = attendance?.dailyTasks ?? [];
      const day: MemberDay = {
        name: member.name,
        state: 'absent',
        leave: leave || undefined,
        tasksTotal: tasks.length,
        tasksDone: tasks.filter((t) => t.status === 'completed').length,
        blocked: tasks
          .filter((t) => t.status === 'blocked')
          .map((t) => t.taskName),
      };
      if (attendance) {
        day.checkIn = formatClock(attendance.checkIn);
        day.state =
          attendance.status === 'on_break'
            ? 'on_break'
            : attendance.status === 'checked_out'
              ? 'checked_out'
              : 'working';
        if (attendance.checkOut) {
          day.checkOut = formatClock(attendance.checkOut);
        }
        day.autoCheckedOut = attendance.autoCheckedOut;
      } else if (fullDay) {
        day.state = 'on_leave';
      }
      return day;
    });
  }
}

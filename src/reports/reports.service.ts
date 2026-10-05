import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';
import { TASK_ORDER } from '../work-plan/work-plan.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { dateKey, nextMidnight, startOfDay } from '../common/time';
import {
  buildPersonDay,
  DayLeave,
  DaySession,
  PersonDay,
  summarizeDays,
} from './person-day';

const MAX_RANGE_DAYS = 92;
const DAY_MS = 24 * 3600 * 1000;

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  teamsUserId: true,
  managerEmails: true,
  shift: { select: { name: true, startTime: true, endTime: true } },
} as const;

type ReportEmployee = {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamsUserId: string | null;
  managerEmails: string[];
  shift: { name: string; startTime: string; endTime: string } | null;
};

/** "2026-10-05" -> the instant that day starts in the company timezone. Noon UTC
 *  always falls on the intended calendar day, whatever the office timezone. */
function dayStart(key: string): Date {
  const start = startOfDay(new Date(`${key}T12:00:00Z`));
  if (isNaN(start.getTime())) throw new BadRequestException('Invalid date');
  return start;
}

/** Every "YYYY-MM-DD" from `from` to `to` inclusive. */
function dateKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  for (
    let t = Date.parse(`${from}T12:00:00Z`);
    t <= Date.parse(`${to}T12:00:00Z`);
    t += DAY_MS
  ) {
    keys.push(new Date(t).toISOString().slice(0, 10));
  }
  return keys;
}

/**
 * Read-only views of who did what for the web dashboard - the Today board, the daily
 * work log, the people table and each person's page. Everything is limited to the
 * employees the requester may see (AdminService.getVisibleEmployeeIds: admins see all,
 * managers their reporting chain, HR their assigned people, everyone themselves).
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  private async visibleEmployees(
    user: JwtPayload,
    onlyId?: string,
  ): Promise<ReportEmployee[]> {
    const visible = await this.adminService.getVisibleEmployeeIds(user);
    if (onlyId && visible !== 'ALL' && !visible.includes(onlyId)) {
      throw new ForbiddenException("You cannot view this employee's work");
    }
    const employees = await this.prisma.employee.findMany({
      where: {
        isActive: true,
        ...(onlyId
          ? { id: onlyId }
          : visible === 'ALL'
            ? {}
            : { id: { in: visible } }),
      },
      select: employeeSelect,
      orderBy: { name: 'asc' },
    });
    if (onlyId && employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }
    return employees;
  }

  /** Sessions and approved leave for the employees over [from, to] (date keys),
   *  as one PersonDay per employee per date. */
  private async buildDays(
    employees: ReportEmployee[],
    from: string,
    to: string,
    now = new Date(),
  ): Promise<Map<string, Map<string, PersonDay>>> {
    const ids = employees.map((e) => e.id);
    const [sessions, leaves] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          employeeId: { in: ids },
          checkIn: { gte: dayStart(from), lt: nextMidnight(dayStart(to)) },
        },
        include: {
          breaks: { orderBy: { breakStart: 'asc' } },
          dailyTasks: { orderBy: TASK_ORDER },
          dailySummary: true,
        },
      }),
      this.prisma.leave.findMany({
        where: {
          employeeId: { in: ids },
          status: LeaveStatus.APPROVED,
          startDate: { lte: new Date(`${to}T00:00:00Z`) },
          endDate: { gte: new Date(`${from}T00:00:00Z`) },
        },
      }),
    ]);

    const keys = dateKeys(from, to);
    const result = new Map<string, Map<string, PersonDay>>();
    for (const employee of employees) {
      const byDate = new Map<string, DaySession[]>();
      for (const s of sessions) {
        if (s.employeeId !== employee.id) continue;
        const key = dateKey(s.checkIn);
        byDate.set(key, [...(byDate.get(key) ?? []), s]);
      }
      const days = new Map<string, PersonDay>();
      for (const key of keys) {
        const day = new Date(`${key}T00:00:00Z`);
        const dayLeaves: DayLeave[] = leaves
          .filter(
            (l) =>
              l.employeeId === employee.id &&
              l.startDate <= day &&
              l.endDate >= day,
          )
          .map((l) => ({
            id: l.id,
            leaveType: l.leaveType,
            startTime: l.startTime,
            endTime: l.endTime,
            durationMinutes: l.durationMinutes,
          }));
        days.set(
          key,
          buildPersonDay(byDate.get(key) ?? [], dayLeaves, employee.shift, now),
        );
      }
      result.set(employee.id, days);
    }
    return result;
  }

  private checkRange(from: string, to: string) {
    const span = (Date.parse(to) - Date.parse(from)) / DAY_MS;
    if (isNaN(span) || span < 0) {
      throw new BadRequestException('"To" must be on or after "From"');
    }
    if (span >= MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Choose at most ${MAX_RANGE_DAYS} days at a time`,
      );
    }
  }

  /** Everyone's day on one date - the Today board and the Work Log. */
  async getDay(user: JwtPayload, date = dateKey(new Date()), now = new Date()) {
    const employees = await this.visibleEmployees(user);
    const days = await this.buildDays(employees, date, date, now);
    const people = employees.map((employee) => ({
      employee,
      day: days.get(employee.id)!.get(date)!,
    }));
    const count = (state: string) =>
      people.filter((p) => p.day.state === state).length;
    return {
      date,
      isToday: date === dateKey(now),
      people,
      totals: {
        people: people.length,
        working: count('working'),
        onBreak: count('on_break'),
        checkedOut: count('checked_out'),
        onLeave: count('on_leave'),
        absent: count('absent'),
        late: people.filter((p) => p.day.late).length,
        workedMinutes: people.reduce((s, p) => s + p.day.workedMinutes, 0),
        tasksPlanned: people.reduce((s, p) => s + p.day.taskStats.planned, 0),
        tasksCompleted: people.reduce(
          (s, p) => s + p.day.taskStats.completed,
          0,
        ),
        tasksBlocked: people.reduce((s, p) => s + p.day.taskStats.blocked, 0),
      },
    };
  }

  /** What needs someone's action: leave they can decide, days closed automatically. */
  async getAttention(user: JwtPayload) {
    const employees = await this.visibleEmployees(user);
    const ids = employees.map((e) => e.id);
    const canDecideFor =
      user.role === Role.ADMIN
        ? ids
        : (await this.adminService.getAllReports(user.email)).map((e) => e.id);

    const [pendingLeaves, autoCheckOuts] = await Promise.all([
      this.prisma.leave.findMany({
        where: {
          status: LeaveStatus.PENDING,
          employeeId: { in: canDecideFor },
        },
        include: { employee: { select: { id: true, name: true } } },
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.attendance.findMany({
        where: {
          autoCheckedOut: true,
          employeeId: { in: ids },
          checkIn: { gte: new Date(Date.now() - 14 * DAY_MS) },
        },
        include: { employee: { select: { id: true, name: true } } },
        orderBy: { checkIn: 'desc' },
      }),
    ]);
    return { pendingLeaves, autoCheckOuts };
  }

  /** One row per visible person over a period - the People table. */
  async getPeople(user: JwtPayload, from: string, to: string) {
    this.checkRange(from, to);
    const now = new Date();
    const employees = await this.visibleEmployees(user);
    const today = dateKey(now);
    const days = await this.buildDays(
      employees,
      from,
      to < today ? to : today,
      now,
    );
    const todayDays =
      to >= today ? null : await this.buildDays(employees, today, today, now);

    return employees.map((employee) => {
      const byDate = days.get(employee.id)!;
      const series = Array.from(byDate.entries()).map(([date, day]) => ({
        date,
        day,
      }));
      return {
        employee,
        today:
          (todayDays ?? days).get(employee.id)!.get(today)?.state ?? 'absent',
        stats: summarizeDays(series),
      };
    });
  }

  /** One person's period: totals, a value per day for the chart, and each day's detail. */
  async getEmployeeReport(
    user: JwtPayload,
    employeeId: string,
    from: string,
    to: string,
  ) {
    this.checkRange(from, to);
    const [employee] = await this.visibleEmployees(user, employeeId);
    const now = new Date();
    const today = dateKey(now);
    const end = to < today ? to : today;
    const days = (await this.buildDays([employee], from, end, now)).get(
      employee.id,
    )!;
    const entries = Array.from(days.entries()).map(([date, day]) => ({
      date,
      day,
    }));

    const full = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        hrEmail: true,
        groups: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    return {
      employee: { ...employee, ...full },
      from,
      to: end,
      stats: summarizeDays(entries),
      series: entries.map(({ date, day }) => ({
        date,
        state: day.state,
        workedMinutes: day.workedMinutes,
        breakMinutes: day.breakMinutes,
        late: day.late,
      })),
      days: entries
        .filter(({ day }) => day.checkIn || day.leaves.length > 0)
        .reverse(),
    };
  }
}

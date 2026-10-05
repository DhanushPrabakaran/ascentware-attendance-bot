import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { LeaveStatus, Prisma } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminService } from '../../admin/admin.service';
import { GroupsService } from '../../groups/groups.service';
import { BotService } from '../bot.service';
import { CardBuilder } from '../cards/CardBuilder';
import { DigestCard } from '../cards/DigestCard';
import { TeamDayService } from './team-day.service';
import {
  atClockTime,
  calendarDateOf,
  dateKey,
  formatClock,
  formatDay,
  formatDuration,
  isoWeekday,
  nextMidnight,
  parseClockTime,
  startOfDay,
} from '../../common/time';

const TICK_MS = 5 * 60 * 1000;
/** A morning send that's this late (server was asleep) is skipped, not sent stale. */
const MORNING_WINDOW_MIN = 3 * 60;
/** Reminders based on a shift fire this long after it starts/ends. */
const SHIFT_GRACE_MIN = 30;
/** Earliest time the "you didn't check out yesterday" notice goes out. */
const NOTICE_FROM = '08:00';
/** Someone who checks in late isn't reminded to check out until they've had this long. */
const MIN_SESSION_BEFORE_REMINDER_MIN = 4 * 60;
const OPEN_STATUSES = ['checked_in', 'on_break'];

type Shift = { startTime: string; endTime: string } | null;

/** "HH:mm" moved by `minutes`, or null if that leaves the day. */
function shiftClock(clock: string, minutes: number): string | null {
  const base = parseClockTime(clock);
  if (base === null) return null;
  const total = base + minutes;
  if (total < 0 || total >= 24 * 60) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/**
 * Proactive messages: check-in/check-out reminders in each person's 1:1 chat with the
 * bot, the morning/evening digest in each Teams group, and the "you didn't check out"
 * notice after an automatic check-out.
 *
 * Runs on a short tick rather than exact timers, because Render's free tier sleeps:
 * each send happens on the first tick after it's due, at most once (claimed in
 * ScheduledSend before sending, so restarts or several instances never double-send).
 * Morning sends that are hours late are skipped instead of arriving stale.
 */
@Injectable()
export class SchedulerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
    private readonly groupsService: GroupsService,
    private readonly botService: BotService,
    private readonly teamDay: TeamDayService,
    private readonly logger: Logger,
  ) {}

  onApplicationBootstrap() {
    if (process.env.SCHEDULER_DISABLED === 'true') return;
    // Give the auto check-out sweep (AutoCheckoutService) a head start on boot.
    setTimeout(() => void this.tick(), 30 * 1000).unref();
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const settings = await this.adminService.getSettings();
      await this.run('auto check-out notices', () =>
        this.sendAutoCheckOutNotices(now),
      );

      const workingDays = settings.workingDays?.length
        ? settings.workingDays
        : [1, 2, 3, 4, 5];
      if (workingDays.includes(isoWeekday(now))) {
        if (settings.remindersEnabled) {
          await this.run('check-in reminders', () =>
            this.sendCheckInReminders(now, settings.checkInReminderTime),
          );
          await this.run('check-out reminders', () =>
            this.sendCheckOutReminders(now, settings.checkOutReminderTime),
          );
        }
        if (settings.digestsEnabled) {
          await this.run('digests', () =>
            this.sendDigests(
              now,
              settings.morningDigestTime,
              settings.eveningDigestTime,
            ),
          );
        }
      }
      await this.run('cleanup', () => this.cleanup(now));
    } catch (e: any) {
      this.logger.error(
        `Scheduler tick failed: ${e.message}`,
        e.stack,
        SchedulerService.name,
      );
    } finally {
      this.running = false;
    }
  }

  /** One failing job (or one failing send inside it) never stops the others. */
  private async run(job: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e: any) {
      this.logger.error(
        `Scheduler job "${job}" failed: ${e.message}`,
        e.stack,
        SchedulerService.name,
      );
    }
  }

  /** True the first time `key` is claimed - the send is then ours to make. */
  async claim(key: string): Promise<boolean> {
    try {
      await this.prisma.scheduledSend.create({ data: { key } });
      return true;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return false;
      }
      throw e;
    }
  }

  private isDue(now: Date, at: Date | null, windowMinutes?: number) {
    if (!at || now < at) return false;
    const end =
      windowMinutes === undefined
        ? nextMidnight(at)
        : new Date(at.getTime() + windowMinutes * 60000);
    return now < end;
  }

  private async send(
    conversationId: string,
    activity: any,
    what: string,
    personal = true,
  ) {
    try {
      await this.botService.sendToConversation(conversationId, activity, {
        personal,
      });
      return true;
    } catch (e: any) {
      this.logger.warn(
        `Could not send ${what}: ${e.message}`,
        SchedulerService.name,
      );
      return false;
    }
  }

  async sendAutoCheckOutNotices(now: Date) {
    if (now < atClockTime(now, NOTICE_FROM)!) return;
    const sessions = await this.prisma.attendance.findMany({
      where: {
        autoCheckedOut: true,
        checkOut: { gte: new Date(now.getTime() - 48 * 3600 * 1000) },
        employee: { isActive: true, teamsConversationId: { not: null } },
      },
      include: { employee: true },
    });
    for (const a of sessions) {
      if (!(await this.claim(`autoclose:${a.id}`))) continue;
      await this.send(
        a.employee.teamsConversationId!,
        {
          type: 'message',
          attachments: [
            CardBuilder.getAutoCheckOutNoticeCard(
              a.id,
              formatDay(a.checkIn),
              a.checkOut ? formatClock(a.checkOut) : 'midnight',
              formatDuration(a.workingMinutes),
            ),
          ],
        },
        `auto check-out notice to ${a.employee.name}`,
      );
    }
  }

  private reachableEmployees() {
    return this.prisma.employee.findMany({
      where: {
        isActive: true,
        teamsUserId: { not: null },
        teamsConversationId: { not: null },
      },
      include: { shift: true },
    });
  }

  /** Reminder time for someone: their shift start/end plus a grace period, else the default. */
  private reminderClock(shift: Shift, edge: 'start' | 'end', fallback: string) {
    if (!shift) return fallback;
    // A night shift's end is on the next day - use the default for its check-out reminder.
    if (
      edge === 'end' &&
      (parseClockTime(shift.endTime) ?? 0) <=
        (parseClockTime(shift.startTime) ?? 0)
    ) {
      return fallback;
    }
    return (
      shiftClock(
        edge === 'start' ? shift.startTime : shift.endTime,
        SHIFT_GRACE_MIN,
      ) ?? fallback
    );
  }

  async sendCheckInReminders(now: Date, defaultClock: string) {
    const employees = await this.reachableEmployees();
    const due = employees
      .map((e) => ({
        employee: e,
        at: atClockTime(
          now,
          this.reminderClock(e.shift, 'start', defaultClock),
        ),
      }))
      .filter((d) => this.isDue(now, d.at, MORNING_WINDOW_MIN));
    if (due.length === 0) return;

    const ids = due.map((d) => d.employee.id);
    const today = calendarDateOf(now);
    const [checkedIn, leaves] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { employeeId: { in: ids }, checkIn: { gte: startOfDay(now) } },
        select: { employeeId: true },
      }),
      this.prisma.leave.findMany({
        where: {
          employeeId: { in: ids },
          status: LeaveStatus.APPROVED,
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
    ]);
    const nowMinutes = parseClockTime(formatClock(now))!;

    for (const { employee } of due) {
      if (checkedIn.some((a) => a.employeeId === employee.id)) continue;
      const onLeave = leaves.some((l) => {
        if (l.employeeId !== employee.id) return false;
        if (!l.startTime || !l.endTime) return true;
        // Hourly leave: skip while it's running; they'll check in after.
        const from = parseClockTime(l.startTime) ?? 0;
        const to = parseClockTime(l.endTime) ?? 0;
        return nowMinutes >= from && nowMinutes < to;
      });
      if (onLeave) continue;
      if (!(await this.claim(`checkin:${employee.id}:${dateKey(now)}`)))
        continue;

      await this.send(
        employee.teamsConversationId!,
        {
          type: 'message',
          attachments: [
            CardBuilder.getCheckInCard(
              employee.name,
              undefined,
              `⏰ Good morning, ${employee.name}! You haven't checked in yet today.`,
            ),
          ],
        },
        `check-in reminder to ${employee.name}`,
      );
    }
  }

  async sendCheckOutReminders(now: Date, defaultClock: string) {
    const open = await this.prisma.attendance.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        checkIn: { gte: startOfDay(now) },
        employee: { isActive: true, teamsConversationId: { not: null } },
      },
      include: { employee: { include: { shift: true } } },
    });

    for (const a of open) {
      const clockAt = atClockTime(
        now,
        this.reminderClock(a.employee.shift, 'end', defaultClock),
      );
      if (!clockAt) continue;
      const at = new Date(
        Math.max(
          clockAt.getTime(),
          a.checkIn.getTime() + MIN_SESSION_BEFORE_REMINDER_MIN * 60000,
        ),
      );
      if (!this.isDue(now, at)) continue;
      if (!(await this.claim(`checkout:${a.employee.id}:${dateKey(now)}`))) {
        continue;
      }

      const name = a.employee.name;
      const card =
        a.status === 'on_break'
          ? CardBuilder.getOnBreakCard(a.id, name)
          : CardBuilder.getWorkingCard(
              a.id,
              name,
              `🌆 Still working, ${name}? Don't forget to check out when you're done.`,
            );
      await this.send(
        a.employee.teamsConversationId!,
        {
          type: 'message',
          ...(a.status === 'on_break'
            ? {
                text: `🌆 You're still on a break, ${name}. Resume work, then check out when you're done.`,
              }
            : {}),
          attachments: [card],
        },
        `check-out reminder to ${name}`,
      );
    }
  }

  async sendDigests(now: Date, morningClock: string, eveningClock: string) {
    const morningDue = this.isDue(
      now,
      atClockTime(now, morningClock),
      MORNING_WINDOW_MIN,
    );
    const eveningDue = this.isDue(now, atClockTime(now, eveningClock));
    if (!morningDue && !eveningDue) return;

    const groups = await this.groupsService.getActiveGroupsWithMembers();
    for (const group of groups) {
      if (group.members.length === 0) continue;
      for (const [kind, due] of [
        ['am', morningDue],
        ['pm', eveningDue],
      ] as const) {
        if (!due) continue;
        if (!(await this.claim(`digest-${kind}:${group.id}:${dateKey(now)}`))) {
          continue;
        }
        const days = await this.teamDay.getMemberDays(group.members, now);
        const card =
          kind === 'am'
            ? DigestCard.morning(formatDay(now), days)
            : DigestCard.evening(formatDay(now), days);
        await this.send(
          group.conversationId,
          { type: 'message', attachments: [card] },
          `${kind === 'am' ? 'morning' : 'evening'} digest to ${group.name}`,
          false,
        );
      }
    }
  }

  /** ScheduledSend rows are only needed for the day they guard - keep a month. */
  async cleanup(now: Date) {
    if (!(await this.claim(`cleanup:${dateKey(now)}`))) return;
    await this.prisma.scheduledSend.deleteMany({
      where: {
        createdAt: { lt: new Date(now.getTime() - 30 * 24 * 3600 * 1000) },
      },
    });
  }
}

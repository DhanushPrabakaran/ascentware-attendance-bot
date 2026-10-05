import { formatClock, parseClockTime } from '../common/time';

/** How late after shift start a check-in still counts as on time. */
export const LATE_GRACE_MIN = 15;

export interface DayTask {
  id: string;
  taskName: string;
  priority: string;
  estimatedMinutes: number;
  timeTakenMinutes: number;
  status: string;
  remarks: string | null;
}

export interface DaySession {
  id: string;
  checkIn: Date;
  checkOut: Date | null;
  status: string;
  workingMinutes: number;
  breakMinutes: number;
  permissionMinutes: number;
  autoCheckedOut: boolean;
  breaks: {
    breakStart: Date;
    breakEnd: Date | null;
    duration: number;
    type: string;
  }[];
  dailyTasks: DayTask[];
  dailySummary?: {
    overallStatus: string;
    blockerType: string | null;
    remarks: string | null;
  } | null;
}

export interface DayLeave {
  id: string;
  leaveType: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
}

export type DayState =
  'working' | 'on_break' | 'checked_out' | 'on_leave' | 'absent';

export interface PersonDay {
  state: DayState;
  /** First check-in / last check-out of the day (several sessions are merged). */
  checkIn: Date | null;
  checkOut: Date | null;
  late: boolean;
  autoCheckedOut: boolean;
  /** Still running for an open session - computed up to `now`. */
  workedMinutes: number;
  breakMinutes: number;
  lunchMinutes: number;
  permissionMinutes: number;
  onBreakSince: Date | null;
  onBreakType: string | null;
  /** Every session's id, latest last - the latest one is the day's "current" session. */
  attendanceIds: string[];
  breaks: { start: Date; end: Date | null; minutes: number; type: string }[];
  tasks: DayTask[];
  taskStats: {
    planned: number;
    completed: number;
    inProgress: number;
    blocked: number;
    notStarted: number;
    estimatedMinutes: number;
    spentMinutes: number;
  };
  leaves: DayLeave[];
  summary: {
    overallStatus: string;
    blockerType: string | null;
    remarks: string | null;
  } | null;
}

const minutesBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));

/**
 * One person's day from their sessions and approved leave: state, merged times, live
 * worked/break minutes for a session still open, and task totals.
 */
export function buildPersonDay(
  sessions: DaySession[],
  leaves: DayLeave[],
  shift: { startTime: string; endTime: string } | null | undefined,
  now = new Date(),
): PersonDay {
  const ordered = [...sessions].sort(
    (a, b) => a.checkIn.getTime() - b.checkIn.getTime(),
  );
  const latest = ordered[ordered.length - 1];

  let worked = 0;
  let breakMinutes = 0;
  let lunch = 0;
  const breaks: PersonDay['breaks'] = [];
  for (const s of ordered) {
    let sessionBreaks = 0;
    for (const b of s.breaks) {
      const minutes = b.breakEnd
        ? b.duration
        : minutesBetween(b.breakStart, now);
      sessionBreaks += minutes;
      if (b.type === 'lunch') lunch += minutes;
      breaks.push({
        start: b.breakStart,
        end: b.breakEnd,
        minutes,
        type: b.type,
      });
    }
    breakMinutes += sessionBreaks;
    worked += s.checkOut
      ? s.workingMinutes
      : Math.max(0, minutesBetween(s.checkIn, now) - sessionBreaks);
  }
  breaks.sort((a, b) => a.start.getTime() - b.start.getTime());

  const tasks = ordered.flatMap((s) => s.dailyTasks);
  const openBreak = latest?.breaks.find((b) => !b.breakEnd) ?? null;

  let state: DayState = 'absent';
  if (latest) {
    state =
      latest.status === 'on_break'
        ? 'on_break'
        : latest.status === 'checked_out'
          ? 'checked_out'
          : 'working';
  } else if (leaves.some((l) => l.durationMinutes == null)) {
    state = 'on_leave';
  }

  const first = ordered[0];
  let late = false;
  const shiftStart = shift ? parseClockTime(shift.startTime) : null;
  if (first && shiftStart !== null) {
    const checkInClock = parseClockTime(formatClock(first.checkIn))!;
    // Hourly leave covering the shift start excuses a late check-in.
    const excused = leaves.some((l) => {
      const from = parseClockTime(l.startTime || '');
      return from !== null && from <= shiftStart + LATE_GRACE_MIN;
    });
    late = !excused && checkInClock > shiftStart + LATE_GRACE_MIN;
  }

  return {
    state,
    checkIn: first?.checkIn ?? null,
    checkOut:
      latest && latest.status === 'checked_out' ? latest.checkOut : null,
    late,
    autoCheckedOut: ordered.some((s) => s.autoCheckedOut),
    workedMinutes: worked,
    breakMinutes,
    lunchMinutes: lunch,
    permissionMinutes: ordered.reduce((sum, s) => sum + s.permissionMinutes, 0),
    onBreakSince: openBreak?.breakStart ?? null,
    onBreakType: openBreak?.type ?? null,
    attendanceIds: ordered.map((s) => s.id),
    breaks,
    tasks,
    taskStats: {
      planned: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      notStarted: tasks.filter((t) => t.status === 'not_started').length,
      estimatedMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
      spentMinutes: tasks.reduce((sum, t) => sum + t.timeTakenMinutes, 0),
    },
    leaves,
    summary: latest?.dailySummary ?? null,
  };
}

/** Totals over many days for one person - the People table and the person page. */
export function summarizeDays(days: { date: string; day: PersonDay }[]) {
  const worked = days.filter((d) => d.day.checkIn);
  const checkInClocks = worked.map((d) =>
    parseClockTime(formatClock(d.day.checkIn!))!,
  );
  const avgCheckIn = checkInClocks.length
    ? Math.round(
        checkInClocks.reduce((a, b) => a + b, 0) / checkInClocks.length,
      )
    : null;
  const sum = (fn: (d: PersonDay) => number) =>
    days.reduce((total, d) => total + fn(d.day), 0);

  return {
    daysWorked: worked.length,
    workedMinutes: sum((d) => d.workedMinutes),
    avgWorkedMinutes: worked.length
      ? Math.round(sum((d) => d.workedMinutes) / worked.length)
      : 0,
    breakMinutes: sum((d) => d.breakMinutes),
    avgCheckIn:
      avgCheckIn === null
        ? null
        : `${String(Math.floor(avgCheckIn / 60)).padStart(2, '0')}:${String(avgCheckIn % 60).padStart(2, '0')}`,
    lateDays: days.filter((d) => d.day.late).length,
    leaveDays: days.filter((d) => d.day.state === 'on_leave').length,
    autoCheckOuts: days.filter((d) => d.day.autoCheckedOut).length,
    tasksPlanned: sum((d) => d.taskStats.planned),
    tasksCompleted: sum((d) => d.taskStats.completed),
    tasksBlocked: sum((d) => d.taskStats.blocked),
    estimatedMinutes: sum((d) => d.taskStats.estimatedMinutes),
    spentMinutes: sum((d) => d.taskStats.spentMinutes),
  };
}

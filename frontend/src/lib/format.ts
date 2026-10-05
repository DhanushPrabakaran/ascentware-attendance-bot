import type { Attendance, Leave } from './types';

/** 45 -> "45 min", 60 -> "1 hr", 65 -> "1 hr 5 min" - mirrors the bot's formatDuration. */
export function formatMinutes(totalMinutes: number | null | undefined): string {
  const minutes = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  const hourPart = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} min`;
}

// Leave dates are stored as UTC midnight of the chosen day - format in UTC so the
// calendar date never shifts with the viewer's timezone.
function leaveDate(iso: string, withYear = true): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/** "6 Oct 2026, 10:00–14:00 (4 hrs)" for leave in hours, a date or date range otherwise. */
export function describeLeave(leave: Leave): string {
  if (leave.startTime && leave.endTime) {
    const duration = leave.durationMinutes != null ? ` (${formatMinutes(leave.durationMinutes)})` : '';
    return `${leaveDate(leave.startDate)}, ${leave.startTime}–${leave.endTime}${duration}`;
  }
  const start = leaveDate(leave.startDate);
  const end = leaveDate(leave.endDate);
  return start === end ? start : `${start} – ${end}`;
}

/** "Lunch 45 min · Breaks 20 min" from the day's break records, or "--" if none. */
export function breakSummary(attendance: Attendance): string {
  const breaks = attendance.breaks || [];
  const lunch = breaks.filter((b) => b.type === 'lunch').reduce((s, b) => s + b.duration, 0);
  const other = breaks.filter((b) => b.type !== 'lunch').reduce((s, b) => s + b.duration, 0);
  const parts: string[] = [];
  if (lunch > 0) parts.push(`Lunch ${formatMinutes(lunch)}`);
  if (other > 0) parts.push(`Breaks ${formatMinutes(other)}`);
  return parts.length ? parts.join(' · ') : '--';
}

/** Worked time for the Hours column ("7 hrs 30 min"), or "--" before check-out. */
export function workedTime(attendance: Attendance): string {
  return attendance.workingMinutes > 0 ? formatMinutes(attendance.workingMinutes) : '--';
}

/** "09:05" in the viewer's clock, or "—". */
export function clock(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's "YYYY-MM-DD" in the viewer's timezone. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" moved by `days`. */
export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Mon, 5 Oct" (or "Mon, 5 Oct 2025" outside the current year) for a "YYYY-MM-DD". */
export function dayLabel(key: string, opts: { weekday?: 'short' | 'long' } = {}): string {
  const d = new Date(`${key}T12:00:00Z`);
  return d.toLocaleDateString(undefined, {
    weekday: opts.weekday ?? 'short',
    day: 'numeric',
    month: 'short',
    ...(d.getUTCFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/** "7.5h" - compact hours for charts and tables. */
export function hoursShort(minutes: number): string {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** "Ship login (1h est, 1.5h spent)" style percentage, or null with nothing to compare. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

/** "YYYY-MM-DD" of an instant in the viewer's timezone. */
export function dateKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

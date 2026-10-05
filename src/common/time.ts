/**
 * Company-timezone helpers. The server runs in UTC (Render), but "today", "midnight"
 * and leave times are all about the office's wall clock - APP_TIMEZONE, IST by default.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/** Offset (ms) of `timeZone`'s wall clock from UTC at the given instant. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant of local midnight that starts `instant`'s day in `timeZone`. */
export function startOfDay(instant: Date, timeZone = APP_TIMEZONE): Date {
  const offset = tzOffsetMs(instant, timeZone);
  const local = new Date(instant.getTime() + offset);
  const midnightAsUtc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  // Re-read the offset at the candidate midnight itself, in case of a DST change that day.
  const guess = new Date(midnightAsUtc - offset);
  return new Date(midnightAsUtc - tzOffsetMs(guess, timeZone));
}

/** The calendar day `instant` falls on in `timeZone`, as UTC midnight of that date -
 *  the same representation date-only columns (e.g. Leave.startDate) are stored in. */
export function calendarDateOf(instant: Date, timeZone = APP_TIMEZONE): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** The local midnight that ends `instant`'s day, i.e. the start of the next day. */
export function nextMidnight(instant: Date, timeZone = APP_TIMEZONE): Date {
  const start = startOfDay(instant, timeZone);
  // +36h always lands inside the next day, even across a 23h/25h DST day.
  return startOfDay(new Date(start.getTime() + 36 * 3600 * 1000), timeZone);
}

/** 45 -> "45 min", 60 -> "1 hr", 65 -> "1 hr 5 min", 150 -> "2 hrs 30 min". */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  const hourPart = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} min`;
}

/** "HH:mm" -> minutes since midnight, or null if malformed. */
export function parseClockTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec((value || '').trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatDate(date: Date): string {
  // Leave dates are stored as UTC midnight of the chosen calendar day, so format in UTC.
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Human-readable leave period: "Mon, 6 Oct 2026, 10:00–14:00 (4 hrs)" for hourly leave,
 *  "Mon, 6 Oct 2026 – Wed, 8 Oct 2026" for multi-day, a single date for one day. */
export function describeLeavePeriod(leave: {
  startDate: Date;
  endDate: Date;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
}): string {
  const start = formatDate(new Date(leave.startDate));
  if (leave.startTime && leave.endTime) {
    const duration =
      leave.durationMinutes != null
        ? ` (${formatDuration(leave.durationMinutes)})`
        : '';
    return `${start}, ${leave.startTime}–${leave.endTime}${duration}`;
  }
  const end = formatDate(new Date(leave.endDate));
  return start === end ? start : `${start} – ${end}`;
}

/** "2026-10-05" - the calendar day `instant` falls on in `timeZone`. */
export function dateKey(instant: Date, timeZone = APP_TIMEZONE): string {
  return calendarDateOf(instant, timeZone).toISOString().slice(0, 10);
}

/** ISO weekday (1 = Monday ... 7 = Sunday) of `instant` in `timeZone`. */
export function isoWeekday(instant: Date, timeZone = APP_TIMEZONE): number {
  const day = calendarDateOf(instant, timeZone).getUTCDay();
  return day === 0 ? 7 : day;
}

/** The instant a company wall-clock time ("HH:mm") occurs on the same day as `day`
 *  (any instant on that day), or null for a malformed time. */
export function atClockTime(
  day: Date,
  clock: string,
  timeZone = APP_TIMEZONE,
): Date | null {
  const minutes = parseClockTime(clock);
  if (minutes === null) return null;
  return new Date(startOfDay(day, timeZone).getTime() + minutes * 60000);
}

/** "09:05" - the company wall-clock time of `instant`. */
export function formatClock(instant: Date, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

/** "Mon, 5 Oct" - the company-timezone day of `instant`. */
export function formatDay(instant: Date, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(instant);
}

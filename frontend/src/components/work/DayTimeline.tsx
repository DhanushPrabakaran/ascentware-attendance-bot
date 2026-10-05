import type { PersonDay } from '../../lib/types';
import { clock, formatMinutes } from '../../lib/format';

const minutesOfDay = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
const parseClock = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};
const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * The day as a bar: worked time, breaks and lunch between check-in and check-out (or
 * now), hourly leave, and the shift window behind it. Scaled to the span that matters.
 */
export function DayTimeline({
  day,
  shift,
  nowIso,
}: {
  day: PersonDay;
  shift?: { startTime: string; endTime: string } | null;
  nowIso?: string;
}) {
  if (!day.checkIn && day.leaves.every((l) => !l.startTime)) return null;

  const start = day.checkIn ? minutesOfDay(day.checkIn) : null;
  const end = day.checkOut
    ? minutesOfDay(day.checkOut)
    : day.checkIn
      ? minutesOfDay(nowIso ?? new Date().toISOString())
      : null;
  const shiftStart = shift ? parseClock(shift.startTime) : null;
  const shiftEnd = shift ? parseClock(shift.endTime) : null;
  const hourly = day.leaves
    .filter((l) => l.startTime && l.endTime)
    .map((l) => ({ from: parseClock(l.startTime!), to: parseClock(l.endTime!), type: l.leaveType }));

  const points = [start, end, shiftStart, shiftEnd, ...hourly.flatMap((h) => [h.from, h.to])].filter(
    (p): p is number => p !== null,
  );
  const lo = Math.floor((Math.min(...points) - 30) / 60) * 60;
  const hi = Math.ceil((Math.max(...points) + 30) / 60) * 60;
  const span = Math.max(60, hi - lo);
  const pos = (m: number) => `${((m - lo) / span) * 100}%`;
  const width = (from: number, to: number) => `${(Math.max(0, to - from) / span) * 100}%`;

  const ticks: number[] = [];
  const step = span > 12 * 60 ? 180 : span > 6 * 60 ? 120 : 60;
  for (let t = lo; t <= hi; t += step) ticks.push(t);

  return (
    <div>
      <div className="relative h-7 rounded-md bg-surfaceHover" role="img" aria-label={`Worked ${formatMinutes(day.workedMinutes)}, breaks ${formatMinutes(day.breakMinutes)}`}>
        {shiftStart !== null && shiftEnd !== null && shiftEnd > shiftStart && (
          <div
            className="absolute inset-y-0 rounded-md border border-dashed border-slate-300"
            style={{ left: pos(shiftStart), width: width(shiftStart, shiftEnd) }}
            title={`Shift ${shift!.startTime}–${shift!.endTime}`}
          />
        )}
        {start !== null && end !== null && (
          <div
            className={`absolute inset-y-1 rounded ${day.checkOut ? 'bg-primary/80' : 'bg-primary/60'}`}
            style={{ left: pos(start), width: width(start, end) }}
            title={`${clock(day.checkIn)}–${day.checkOut ? clock(day.checkOut) : 'now'}`}
          />
        )}
        {day.breaks.map((b, i) => {
          const from = minutesOfDay(b.start);
          const to = b.end ? minutesOfDay(b.end) : end ?? from;
          return (
            <div
              key={i}
              className={`absolute inset-y-1 rounded-sm ${b.type === 'lunch' ? 'bg-orange-400' : 'bg-amber-300'}`}
              style={{ left: pos(from), width: width(from, to) }}
              title={`${b.type === 'lunch' ? 'Lunch' : 'Break'} ${clock(b.start)}–${b.end ? clock(b.end) : 'now'} (${formatMinutes(b.minutes)})`}
            />
          );
        })}
        {hourly.map((h, i) => (
          <div
            key={`l${i}`}
            className="absolute inset-y-1 rounded-sm bg-violet-300/80"
            style={{ left: pos(h.from), width: width(h.from, h.to) }}
            title={`${h.type} ${hhmm(h.from)}–${hhmm(h.to)}`}
          />
        ))}
      </div>
      <div className="relative mt-1 h-4 text-[10px] tabular-nums text-tertiary">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: pos(t) }}>
            {hhmm(t)}
          </span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tertiary">
        <Legend className="bg-primary/80" label="Working" />
        {day.breaks.some((b) => b.type !== 'lunch') && <Legend className="bg-amber-300" label="Break" />}
        {day.breaks.some((b) => b.type === 'lunch') && <Legend className="bg-orange-400" label="Lunch" />}
        {hourly.length > 0 && <Legend className="bg-violet-300" label="Leave" />}
        {shift && <Legend className="border border-dashed border-slate-400" label="Shift" />}
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-3 rounded-sm ${className}`} aria-hidden />
      {label}
    </span>
  );
}

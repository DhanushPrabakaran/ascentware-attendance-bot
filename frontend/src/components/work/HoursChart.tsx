import type { EmployeeReport } from '../../lib/types';
import { dayLabel, formatMinutes, todayKey } from '../../lib/format';

const BAR_COLOR: Record<string, string> = {
  working: 'bg-emerald-500',
  on_break: 'bg-amber-400',
  checked_out: 'bg-primary',
};

const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sun
const dayOfMonth = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDate();
const monthShort = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });

/** Which days get an x-axis label, and what it says - every day for a week, Mondays
 *  for a month, month starts for a quarter. */
function xLabel(date: string, i: number, count: number): string | null {
  if (count <= 7) {
    return `${new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })} ${dayOfMonth(date)}`;
  }
  if (count <= 31) {
    // Mondays, plus the first day when it isn't right next to one (avoids "6 Sep 7 Sep").
    const first = i === 0 && weekday(date) >= 2 && weekday(date) <= 5;
    return weekday(date) === 1 || first ? `${dayOfMonth(date)} ${monthShort(date)}` : null;
  }
  return dayOfMonth(date) === 1 || i === 0 ? monthShort(date) : null;
}

/**
 * Hours worked per day: one column per calendar day, an hours scale on the left, the
 * shift length as a dashed line, weekends shaded, and the hours written on each bar.
 */
export function HoursChart({
  series,
  targetMinutes,
}: {
  series: EmployeeReport['series'];
  targetMinutes?: number | null;
}) {
  if (series.length === 0) return null;
  const peak = Math.max(...series.map((s) => s.workedMinutes), targetMinutes ?? 0, 8 * 60);
  const step = peak > 16 * 60 ? 4 : 2; // hours between scale lines
  const maxHours = Math.ceil(peak / 60 / step) * step;
  const max = maxHours * 60;
  const ticks = Array.from({ length: maxHours / step + 1 }, (_, i) => i * step);
  const showValues = series.length <= 31;
  const today = todayKey();
  const pct = (minutes: number) => `${Math.min(100, (minutes / max) * 100)}%`;

  return (
    <figure>
      <div className="flex">
        {/* Hours scale */}
        <div className="relative mr-2 h-48 w-7 shrink-0 text-right text-[10px] tabular-nums text-tertiary" aria-hidden>
          {ticks.map((h) => (
            <span key={h} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: pct(h * 60) }}>
              {h}h
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-48 border-b border-borderBase" role="img" aria-label="Hours worked per day">
            {ticks.slice(1).map((h) => (
              <div key={h} className="absolute inset-x-0 border-t border-borderBase/70" style={{ bottom: pct(h * 60) }} aria-hidden />
            ))}
            {targetMinutes ? (
              <div className="absolute inset-x-0 z-10 border-t border-dashed border-slate-400" style={{ bottom: pct(targetMinutes) }} aria-hidden>
                <span className="absolute -top-4 right-0 rounded bg-surface px-1 text-[10px] text-tertiary">
                  shift {formatMinutes(targetMinutes)}
                </span>
              </div>
            ) : null}

            <div className="absolute inset-0 flex">
              {series.map((s) => {
                const weekend = weekday(s.date) === 0 || weekday(s.date) === 6;
                const leave = s.state === 'on_leave';
                const tip = `${dayLabel(s.date, { weekday: 'long' })}: ${
                  leave ? 'on leave' : s.workedMinutes ? formatMinutes(s.workedMinutes) : 'no check-in'
                }${s.late ? ', late check-in' : ''}${s.date === today && s.state !== 'checked_out' && s.workedMinutes ? ' (so far)' : ''}`;
                return (
                  <div
                    key={s.date}
                    title={tip}
                    className={`group relative flex h-full flex-1 items-end justify-center ${weekend ? 'bg-surfaceHover/70' : ''}`}
                  >
                    {leave ? (
                      <div className="mx-[15%] h-5 w-full rounded-t-sm bg-violet-200" />
                    ) : s.workedMinutes > 0 ? (
                      <div
                        className={`relative mx-[15%] w-full rounded-t-sm ${BAR_COLOR[s.state] ?? 'bg-primary'} group-hover:opacity-80`}
                        style={{ height: pct(s.workedMinutes) }}
                      >
                        {showValues && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium tabular-nums text-secondary/80">
                            {(s.workedMinutes / 60).toFixed(1).replace(/\.0$/, '')}
                          </span>
                        )}
                        {s.late && <span className="absolute -bottom-2.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-500" />}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day labels */}
          <div className="relative mt-3 flex h-4 text-[10px] text-tertiary" aria-hidden>
            {series.map((s, i) => {
              const label = xLabel(s.date, i, series.length);
              return (
                <div key={s.date} className="relative flex-1">
                  {label && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{label}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-9 text-[11px] text-tertiary">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-primary" />Worked (hours on the bar)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-emerald-500" />Today, still in</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-violet-200" />Leave</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Late check-in</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-surfaceHover ring-1 ring-borderBase" />Weekend</span>
      </figcaption>
    </figure>
  );
}

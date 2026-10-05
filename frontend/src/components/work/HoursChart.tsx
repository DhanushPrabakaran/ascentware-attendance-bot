import type { EmployeeReport } from '../../lib/types';
import { dayLabel, formatMinutes, hoursShort } from '../../lib/format';

const STATE_COLOR: Record<string, string> = {
  working: 'fill-emerald-500',
  on_break: 'fill-amber-400',
  checked_out: 'fill-primary',
  on_leave: 'fill-violet-300',
  absent: 'fill-transparent',
};

/** Hours worked per day as bars, with the shift length as a dashed target line. */
export function HoursChart({
  series,
  targetMinutes,
}: {
  series: EmployeeReport['series'];
  targetMinutes?: number | null;
}) {
  if (series.length === 0) return null;
  const max = Math.max(9 * 60, targetMinutes ?? 0, ...series.map((s) => s.workedMinutes)) * 1.1;
  const height = 160;
  const barGap = series.length > 45 ? 1 : 3;
  const labelEvery = Math.ceil(series.length / 8);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${series.length * 20} ${height}`}
        preserveAspectRatio="none"
        className="h-44 w-full"
        role="img"
        aria-label="Hours worked per day"
      >
        {/* A faint line every 2 hours. */}
        {Array.from({ length: Math.floor(max / 120) }, (_, i) => (i + 1) * 120).map((m) => (
          <line
            key={m}
            x1={0}
            x2={series.length * 20}
            y1={height - (m / max) * height}
            y2={height - (m / max) * height}
            className="stroke-borderBase"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {series.map((s, i) => {
          const h = (s.workedMinutes / max) * height;
          const leave = s.state === 'on_leave';
          return (
            <g key={s.date}>
              <title>
                {`${dayLabel(s.date)}: ${leave ? 'on leave' : s.workedMinutes ? formatMinutes(s.workedMinutes) : 'no check-in'}${s.late ? ' (late)' : ''}`}
              </title>
              <rect
                x={i * 20 + barGap}
                y={leave ? height - 6 : height - h}
                width={20 - barGap * 2}
                height={leave ? 6 : Math.max(h, s.workedMinutes ? 2 : 0)}
                rx={2}
                className={`${STATE_COLOR[s.state] ?? 'fill-primary'} ${s.late ? 'opacity-70' : ''}`}
              />
            </g>
          );
        })}
        {targetMinutes ? (
          <line
            x1={0}
            x2={series.length * 20}
            y1={height - (targetMinutes / max) * height}
            y2={height - (targetMinutes / max) * height}
            className="stroke-slate-400"
            strokeDasharray="4 3"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      <div className="mt-1 grid text-center text-[10px] tabular-nums text-tertiary" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }} aria-hidden>
        {series.map((s, i) => (
          <span key={s.date}>{i % labelEvery === 0 ? new Date(`${s.date}T12:00:00Z`).getUTCDate() : ''}</span>
        ))}
      </div>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tertiary">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-primary" />Worked</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-violet-300" />Leave</span>
        {targetMinutes ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 border-t border-dashed border-slate-400" />Shift length ({hoursShort(targetMinutes)})
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

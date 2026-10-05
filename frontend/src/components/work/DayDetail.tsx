import type { ReactNode } from 'react';
import type { PersonDay } from '../../lib/types';
import { clock, formatMinutes } from '../../lib/format';
import { DayTimeline } from './DayTimeline';
import { TaskTable } from './TaskTable';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-tertiary">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-secondary">{children}</dd>
    </div>
  );
}

/** Everything about one person's day: times, a timeline, and the task table. */
export function DayDetail({
  day,
  shift,
  actions,
}: {
  day: PersonDay;
  shift?: { startTime: string; endTime: string } | null;
  actions?: ReactNode;
}) {
  const open = day.state === 'working' || day.state === 'on_break';
  const { taskStats: t } = day;

  return (
    <div className="space-y-5">
      {day.leaves.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {day.leaves.map((l) => (
            <span key={l.id} className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
              {l.leaveType}
              {l.startTime && l.endTime ? ` ${l.startTime}–${l.endTime}` : ' · full day'}
            </span>
          ))}
        </div>
      )}

      {day.checkIn && (
        <>
          <dl className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <Fact label="Checked in">
              {clock(day.checkIn)}
              {day.late && <span className="ml-1.5 text-xs font-medium text-amber-700">late</span>}
            </Fact>
            <Fact label="Checked out">
              {day.checkOut ? clock(day.checkOut) : open ? <span className="text-emerald-700">still in</span> : '—'}
              {day.autoCheckedOut && <span className="ml-1.5 text-xs font-medium text-amber-700">auto</span>}
            </Fact>
            <Fact label={open ? 'Worked so far' : 'Worked'}>{formatMinutes(day.workedMinutes)}</Fact>
            <Fact label="Breaks">{formatMinutes(day.breakMinutes - day.lunchMinutes)}</Fact>
            <Fact label="Lunch">{formatMinutes(day.lunchMinutes)}</Fact>
            <Fact label="Tasks done">
              {t.planned ? `${t.completed} / ${t.planned}` : '—'}
            </Fact>
          </dl>
          <DayTimeline day={day} shift={shift} />
        </>
      )}

      {(day.checkIn || day.tasks.length > 0) && (
        <div>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Tasks</h4>
            {t.planned > 0 && (
              <span className="text-xs text-tertiary">
                Estimated {formatMinutes(t.estimatedMinutes)}
                {t.spentMinutes > 0 && ` · spent ${formatMinutes(t.spentMinutes)}`}
                {t.blocked > 0 && <span className="text-red-600"> · {t.blocked} blocked</span>}
              </span>
            )}
          </div>
          <TaskTable tasks={day.tasks} reviewed={!open} />
        </div>
      )}

      {day.summary && (day.summary.remarks || day.summary.blockerType) && (
        <div className="rounded-lg bg-surfaceHover px-4 py-3 text-sm">
          <span className="font-medium text-secondary">Day summary: </span>
          <span className="text-secondary/80">
            {[day.summary.overallStatus, day.summary.blockerType, day.summary.remarks].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

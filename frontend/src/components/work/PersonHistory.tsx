import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { EmployeeReport, PersonDay } from '../../lib/types';
import { addDays, clock, dayLabel, formatMinutes, percent, todayKey } from '../../lib/format';
import { Card, EmptyState, ErrorBanner, Loading, Segmented, Stat } from '../ui/Page';
import { DayDetail } from './DayDetail';
import { DayStatePill } from './status';
import { HoursChart } from './HoursChart';

export type Period = '7' | '30' | '90';

export function usePersonReport(employeeId: string | undefined, period: Period) {
  const [report, setReport] = useState<EmployeeReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    try {
      setReport(
        await api.reports.employee(employeeId, {
          from: addDays(todayKey(), -(Number(period) - 1)),
          to: todayKey(),
        }),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    }
  }, [employeeId, period]);

  useEffect(() => {
    load();
  }, [load]);

  return { report, error, reload: load };
}

export const periodOptions: { value: Period; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

function shiftMinutes(shift: { startTime: string; endTime: string } | null) {
  if (!shift) return null;
  const toMin = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5));
  const len = toMin(shift.endTime) - toMin(shift.startTime);
  return len > 0 ? len : null;
}

function DaySummaryLine({ day }: { day: PersonDay }) {
  const parts: string[] = [];
  if (day.checkIn) parts.push(`${clock(day.checkIn)}–${day.checkOut ? clock(day.checkOut) : 'now'}`);
  if (day.checkIn) parts.push(formatMinutes(day.workedMinutes));
  if (day.taskStats.planned) parts.push(`${day.taskStats.completed}/${day.taskStats.planned} tasks`);
  return <span className="tabular-nums">{parts.join(' · ')}</span>;
}

/** A person's period: headline numbers, hours per day, and every day in detail. */
export function PersonHistory({
  report,
  error,
  period,
  onPeriodChange,
  headerActions,
  dayActions,
  excludeToday = false,
}: {
  report: EmployeeReport | null;
  error: string | null;
  period: Period;
  onPeriodChange: (p: Period) => void;
  headerActions?: ReactNode;
  dayActions?: (date: string, day: PersonDay) => ReactNode;
  /** Leave today out of "Day by day" - for a page that already shows today above. */
  excludeToday?: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const days = (report?.days ?? []).filter((d) => !excludeToday || d.date !== todayKey());

  // Open the most recent day whenever a new report arrives.
  useEffect(() => {
    const first = report?.days.find((d) => !excludeToday || d.date !== todayKey());
    if (first) setOpen(new Set([first.date]));
  }, [report, excludeToday]);

  const toggle = (date: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });

  const s = report?.stats;
  const done = s ? percent(s.tasksCompleted, s.tasksPlanned) : null;
  const accuracy = s && s.estimatedMinutes && s.spentMinutes ? percent(s.spentMinutes, s.estimatedMinutes) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Period" value={period} onChange={onPeriodChange} options={periodOptions} />
        {headerActions && <div className="flex gap-2">{headerActions}</div>}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {!report || !s ? (
        !error && <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Days worked" value={s.daysWorked} hint={s.leaveDays ? `${s.leaveDays} on leave` : undefined} />
            <Stat label="Hours worked" value={formatMinutes(s.workedMinutes)} hint={s.daysWorked ? `${formatMinutes(s.avgWorkedMinutes)} a day on average` : undefined} />
            <Stat
              label="Average check-in"
              value={s.avgCheckIn ?? '—'}
              hint={s.lateDays ? `${s.lateDays} late day${s.lateDays === 1 ? '' : 's'}` : 'never late'}
              tone={s.lateDays ? 'warn' : 'default'}
            />
            <Stat
              label="Tasks done"
              value={s.tasksPlanned ? `${s.tasksCompleted}/${s.tasksPlanned}` : '—'}
              hint={
                done !== null
                  ? `${done}% completed${s.tasksBlocked ? ` · ${s.tasksBlocked} blocked` : ''}`
                  : undefined
              }
              tone="good"
            />
          </div>

          <Card
            title="Hours per day"
            actions={
              accuracy !== null ? (
                <span className="text-xs text-tertiary">
                  Spent {formatMinutes(s.spentMinutes)} on tasks, {accuracy}% of the {formatMinutes(s.estimatedMinutes)} estimated
                </span>
              ) : null
            }
          >
            <HoursChart series={report.series} targetMinutes={shiftMinutes(report.employee.shift)} />
          </Card>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-secondary">Day by day</h3>
            {days.length === 0 ? (
              <EmptyState title="No work recorded in this period" />
            ) : (
              <ul className="space-y-2">
                {days.map(({ date, day }) => {
                  const isOpen = open.has(date);
                  return (
                    <li key={date} className="overflow-hidden rounded-xl border border-borderBase bg-surface shadow-saas">
                      <button
                        type="button"
                        onClick={() => toggle(date)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surfaceHover/50 sm:px-5"
                      >
                        <span className="w-28 shrink-0 text-sm font-semibold text-secondary">
                          {date === todayKey() ? 'Today' : dayLabel(date)}
                        </span>
                        <DayStatePill state={day.state} />
                        {day.late && <span className="text-[11px] font-medium text-amber-700">Late</span>}
                        {day.autoCheckedOut && <span className="text-[11px] font-medium text-amber-700">Auto check-out</span>}
                        <span className="ml-auto hidden text-xs text-tertiary sm:inline">
                          <DaySummaryLine day={day} />
                        </span>
                        <ChevronDown size={16} className={`shrink-0 text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-borderBase bg-background/60 px-4 py-4 sm:px-5">
                          <DayDetail day={day} shift={report.employee.shift} actions={dayActions?.(date, day)} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

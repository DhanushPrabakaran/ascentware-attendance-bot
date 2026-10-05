import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { PersonDay, ReportEmployee } from '../../lib/types';
import { clock, formatMinutes } from '../../lib/format';
import { Avatar, Progress } from '../ui/Page';
import { DayDetail } from './DayDetail';
import { DayStatePill } from './status';
import type { CorrectableDay } from '../CorrectCheckOutModal';

export interface PersonDayEntry {
  employee: ReportEmployee;
  day: PersonDay;
  canEditTasks?: boolean;
}

/** The single session behind a finished day, for the check-out correction modal -
 *  null for a day still open or split across several sessions. */
export function correctableDay(entry: PersonDayEntry): CorrectableDay | null {
  const { day } = entry;
  if (!day.checkIn || !day.checkOut || day.attendanceIds.length !== 1) return null;
  return {
    id: day.attendanceIds[0],
    checkIn: day.checkIn,
    checkOut: day.checkOut,
    autoCheckedOut: day.autoCheckedOut,
    employee: { name: entry.employee.name },
  };
}

/** What they're on now: the first task still in progress, else the next not started. */
function focusTask(day: PersonDay) {
  return (
    day.tasks.find((t) => t.status === 'in_progress') ??
    day.tasks.find((t) => t.status === 'not_started' || t.status === 'blocked')
  );
}

function statusLine(day: PersonDay) {
  if (day.state === 'on_break' && day.onBreakSince) {
    return `${day.onBreakType === 'lunch' ? 'Lunch' : 'Break'} since ${clock(day.onBreakSince)}`;
  }
  if (day.state === 'on_leave') return day.leaves.map((l) => l.leaveType).join(', ');
  if (day.state === 'absent' && day.leaves.length) {
    return day.leaves.map((l) => `${l.leaveType} ${l.startTime}–${l.endTime}`).join(', ');
  }
  return null;
}

/**
 * People and their day as expandable rows: status, times, hours and task progress at a
 * glance; the full timeline and task table on expand. Used by Today and the Work Log.
 */
export function PersonDayList({
  entries,
  expanded,
  onToggle,
  live,
  renderActions,
  onChanged,
}: {
  entries: PersonDayEntry[];
  expanded: Set<string>;
  onToggle: (employeeId: string) => void;
  /** Today's view: show "worked so far" and what they're working on. */
  live?: boolean;
  renderActions?: (entry: PersonDayEntry) => ReactNode;
  onChanged?: () => void;
}) {
  return (
    <ul className="divide-y divide-borderBase overflow-hidden rounded-xl border border-borderBase bg-surface shadow-saas">
      {entries.map((entry) => {
        const { employee, day } = entry;
        const isOpen = expanded.has(employee.id);
        const t = day.taskStats;
        const focus = live ? focusTask(day) : undefined;
        const sub = statusLine(day);
        const hasDetail = !!day.checkIn || day.tasks.length > 0 || day.leaves.length > 0;

        return (
          <li key={employee.id}>
            <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
              <Avatar name={employee.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link to={`/employees/${employee.id}`} className="truncate text-sm font-semibold text-secondary hover:text-primary">
                    {employee.name}
                  </Link>
                  <DayStatePill state={day.state} />
                  {day.late && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                      Late
                    </span>
                  )}
                  {day.autoCheckedOut && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20" title="Didn't check out - closed automatically">
                      Auto check-out
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-tertiary">
                  {sub ??
                    (focus ? (
                      <>Now: <span className="text-secondary/80">{focus.taskName}</span></>
                    ) : (
                      employee.shift ? `${employee.shift.name} · ${employee.shift.startTime}–${employee.shift.endTime}` : employee.email
                    ))}
                </p>
              </div>

              <dl className="hidden items-center gap-6 text-right lg:flex">
                <div className="w-14">
                  <dt className="text-[11px] text-tertiary">In</dt>
                  <dd className="text-sm font-medium tabular-nums text-secondary">{clock(day.checkIn)}</dd>
                </div>
                <div className="w-14">
                  <dt className="text-[11px] text-tertiary">Out</dt>
                  <dd className="text-sm font-medium tabular-nums text-secondary">{clock(day.checkOut)}</dd>
                </div>
                <div className="w-24">
                  <dt className="text-[11px] text-tertiary">{live && !day.checkOut ? 'Worked so far' : 'Worked'}</dt>
                  <dd className="text-sm font-medium tabular-nums text-secondary">{day.checkIn ? formatMinutes(day.workedMinutes) : '—'}</dd>
                </div>
              </dl>
              <div className="hidden w-32 sm:block">
                <div className="mb-1 flex justify-between text-[11px] text-tertiary">
                  <span>Tasks</span>
                  <span className="tabular-nums">
                    {t.planned ? `${t.completed}/${t.planned}` : '—'}
                    {t.blocked > 0 && <span className="ml-1 text-red-600">· {t.blocked} blocked</span>}
                  </span>
                </div>
                <Progress value={t.completed} max={t.planned} tone="good" label={`${t.completed} of ${t.planned} tasks done`} />
              </div>

              <button
                type="button"
                onClick={() => onToggle(employee.id)}
                disabled={!hasDetail}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Hide' : 'Show'} ${employee.name}'s day`}
                className="rounded-md p-1.5 text-tertiary hover:bg-surfaceHover hover:text-secondary disabled:invisible"
              >
                <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-borderBase bg-background/60 px-4 py-4 sm:px-5">
                <DayDetail
                  day={day}
                  shift={employee.shift}
                  actions={renderActions?.(entry)}
                  canEditTasks={entry.canEditTasks}
                  onChanged={onChanged}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { PeopleRow } from '../lib/types';
import { addDays, formatMinutes, percent, todayKey } from '../lib/format';
import { Avatar, EmptyState, ErrorBanner, Loading, PageHeader, Progress, Segmented } from '../components/ui/Page';
import { Button } from '../components/ui/Button';
import { DayStatePill } from '../components/work/status';
import { ExportTimesheetModal } from '../components/ExportTimesheetModal';

type Period = '7' | '30' | '90';
type SortKey = 'name' | 'daysWorked' | 'avgWorked' | 'avgCheckIn' | 'late' | 'tasks' | 'leave';

const sorters: Record<SortKey, (r: PeopleRow) => number | string> = {
  name: (r) => r.employee.name.toLowerCase(),
  daysWorked: (r) => r.stats.daysWorked,
  avgWorked: (r) => r.stats.avgWorkedMinutes,
  avgCheckIn: (r) => r.stats.avgCheckIn ?? '99:99',
  late: (r) => r.stats.lateDays,
  tasks: (r) => percent(r.stats.tasksCompleted, r.stats.tasksPlanned) ?? -1,
  leave: (r) => r.stats.leaveDays,
};

/** Everyone you can see, with how their last week/month/quarter went. */
export default function People() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30');
  const [rows, setRows] = useState<PeopleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setRows(null);
    api.reports
      .people({ from: addDays(todayKey(), -(Number(period) - 1)), to: todayKey() })
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load people'));
  }, [period]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (rows ?? []).filter(
      (r) => !q || r.employee.name.toLowerCase().includes(q) || r.employee.email.toLowerCase().includes(q),
    );
    const get = sorters[sort.key];
    return [...filtered].sort((a, b) => (get(a) > get(b) ? sort.dir : get(a) < get(b) ? -sort.dir : 0));
  }, [rows, query, sort]);

  const header = (key: SortKey, label: string, align: 'left' | 'right' = 'right') => (
    <th scope="col" className={`whitespace-nowrap px-4 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : key === 'name' ? 1 : -1 }))}
        className="inline-flex items-center gap-1 hover:text-secondary"
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description="Attendance and task delivery per person. Click someone to see their days in detail."
        actions={
          <>
            <Segmented
              label="Period"
              value={period}
              onChange={setPeriod}
              options={[
                { value: '7', label: '7 days' },
                { value: '30', label: '30 days' },
                { value: '90', label: '90 days' },
              ]}
            />
            <Button variant="secondary" onClick={() => setExportOpen(true)}>
              <Download size={14} /> Export
            </Button>
          </>
        }
      />

      <label className="relative block sm:w-72">
        <span className="sr-only">Search people</span>
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          className="w-full rounded-lg border border-borderBase bg-surface py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {!rows ? (
        !error && <Loading />
      ) : visible.length === 0 ? (
        <EmptyState title="No one to show">{rows.length ? 'No one matches your search.' : "You don't have anyone reporting to you yet."}</EmptyState>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-borderBase bg-surface shadow-saas md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-borderBase bg-surfaceHover/50 text-xs text-tertiary">
                <tr>
                  {header('name', 'Person', 'left')}
                  <th scope="col" className="px-4 py-3 text-left font-medium">Today</th>
                  {header('daysWorked', 'Days worked')}
                  {header('avgWorked', 'Avg / day')}
                  {header('avgCheckIn', 'Avg check-in')}
                  {header('late', 'Late')}
                  {header('tasks', 'Tasks done')}
                  <th scope="col" className="px-4 py-3 text-right font-medium">Time on tasks</th>
                  {header('leave', 'Leave')}
                </tr>
              </thead>
              <tbody className="divide-y divide-borderBase">
                {visible.map(({ employee, today, stats: s }) => {
                  const done = percent(s.tasksCompleted, s.tasksPlanned);
                  return (
                    <tr key={employee.id} onClick={() => navigate(`/employees/${employee.id}`)} className="cursor-pointer hover:bg-surfaceHover/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={employee.name} size="sm" />
                          <div className="min-w-0">
                            <Link to={`/employees/${employee.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-secondary hover:text-primary">
                              {employee.name}
                            </Link>
                            <p className="truncate text-xs text-tertiary">{employee.shift ? `${employee.shift.name} ${employee.shift.startTime}–${employee.shift.endTime}` : employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><DayStatePill state={today} /></td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.daysWorked}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.daysWorked ? formatMinutes(s.avgWorkedMinutes) : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.avgCheckIn ?? '—'}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${s.lateDays ? 'font-medium text-amber-700' : 'text-tertiary'}`}>{s.lateDays || '—'}</td>
                      <td className="px-4 py-3">
                        {s.tasksPlanned ? (
                          <div className="ml-auto w-28">
                            <div className="mb-1 text-right text-xs tabular-nums text-secondary">
                              {s.tasksCompleted}/{s.tasksPlanned}
                              <span className="text-tertiary"> · {done}%</span>
                            </div>
                            <Progress value={s.tasksCompleted} max={s.tasksPlanned} tone="good" />
                          </div>
                        ) : (
                          <div className="text-right text-tertiary">—</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">
                        {s.spentMinutes ? (
                          <>
                            <span className="font-medium text-secondary">{formatMinutes(s.spentMinutes)}</span>
                            <span className="block text-tertiary">of {formatMinutes(s.estimatedMinutes)} est.</span>
                          </>
                        ) : (
                          <span className="text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-tertiary">{s.leaveDays || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {visible.map(({ employee, today, stats: s }) => (
              <li key={employee.id}>
                <Link to={`/employees/${employee.id}`} className="block rounded-xl border border-borderBase bg-surface p-4 shadow-saas">
                  <div className="flex items-center gap-3">
                    <Avatar name={employee.name} size="sm" />
                    <span className="flex-1 font-semibold text-secondary">{employee.name}</span>
                    <DayStatePill state={today} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div><dt className="text-tertiary">Days</dt><dd className="font-semibold tabular-nums">{s.daysWorked}</dd></div>
                    <div><dt className="text-tertiary">Avg / day</dt><dd className="font-semibold tabular-nums">{s.daysWorked ? formatMinutes(s.avgWorkedMinutes) : '—'}</dd></div>
                    <div><dt className="text-tertiary">Tasks done</dt><dd className="font-semibold tabular-nums">{s.tasksPlanned ? `${s.tasksCompleted}/${s.tasksPlanned}` : '—'}</dd></div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <ExportTimesheetModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

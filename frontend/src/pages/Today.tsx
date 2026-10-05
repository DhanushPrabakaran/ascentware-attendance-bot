import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, RefreshCw, Search, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Attention, DayReport } from '../lib/types';
import { clock, dateKeyOf, dayLabel, describeLeave, todayKey } from '../lib/format';
import { useAuth } from '../lib/auth';
import { Card, EmptyState, ErrorBanner, Loading, PageHeader, Segmented, Stat } from '../components/ui/Page';
import { Button } from '../components/ui/Button';
import { PersonDayList, correctableDay, type PersonDayEntry } from '../components/work/PersonDayList';
import { CorrectCheckOutModal, type CorrectableDay } from '../components/CorrectCheckOutModal';

type Filter = 'all' | 'in' | 'not_in' | 'leave';
const REFRESH_MS = 60 * 1000;

/** Live board for managers/admins: who's in, how the day is going, what needs action. */
export default function Today() {
  const { user } = useAuth();
  const [report, setReport] = useState<DayReport | null>(null);
  const [attention, setAttention] = useState<Attention | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [correcting, setCorrecting] = useState<CorrectableDay | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [day, att] = await Promise.all([api.reports.day(todayKey()), api.reports.attention()]);
      setReport(day);
      setAttention(att);
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load today');
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const entries = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    return report.people.filter(({ employee, day }) => {
      if (q && !employee.name.toLowerCase().includes(q) && !employee.email.toLowerCase().includes(q)) return false;
      if (filter === 'in') return day.state === 'working' || day.state === 'on_break';
      if (filter === 'not_in') return day.state === 'absent';
      if (filter === 'leave') return day.state === 'on_leave' || day.leaves.length > 0;
      return true;
    });
  }, [report, filter, query]);

  const blocked = useMemo(
    () =>
      (report?.people ?? []).flatMap(({ employee, day }) =>
        day.tasks.filter((t) => t.status === 'blocked').map((t) => ({ employee, task: t })),
      ),
    [report],
  );

  const decide = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setDeciding(id);
    try {
      await api.leaves.updateStatus(id, status);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update leave');
    } finally {
      setDeciding(null);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const actions = (entry: PersonDayEntry) => {
    const fixable = correctableDay(entry);
    if (!fixable || (entry.employee.id === user?.id && !fixable.autoCheckedOut && user?.role !== 'ADMIN')) return null;
    return (
      <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setCorrecting(fixable)}>
        Correct check-out
      </Button>
    );
  };

  if (!report) return error ? <ErrorBanner>{error}</ErrorBanner> : <Loading />;
  const t = report.totals;
  const pending = attention?.pendingLeaves ?? [];
  const autos = attention?.autoCheckOuts ?? [];
  const needsAttention = pending.length + autos.length + blocked.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today"
        description={`${dayLabel(report.date, { weekday: 'long' })} · ${t.people} ${t.people === 1 ? 'person' : 'people'}`}
        actions={
          <>
            {updatedAt && <span className="text-xs text-tertiary">Updated {clock(updatedAt.toISOString())}</span>}
            <Button variant="secondary" onClick={load} aria-label="Refresh">
              <RefreshCw size={14} />
            </Button>
            <Link to="/work-log">
              <Button variant="secondary">Work log</Button>
            </Link>
          </>
        }
      />
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Working now" value={t.working} tone="good" />
        <Stat label="On break" value={t.onBreak} tone={t.onBreak ? 'warn' : 'muted'} />
        <Stat label="Checked out" value={t.checkedOut} tone="muted" />
        <Stat label="On leave" value={t.onLeave} tone="muted" />
        <Stat label="Not checked in" value={t.absent} tone={t.absent ? 'bad' : 'muted'} hint={t.late ? `${t.late} late today` : undefined} />
        <Stat
          label="Tasks done"
          value={t.tasksPlanned ? `${t.tasksCompleted}/${t.tasksPlanned}` : '—'}
          hint={t.tasksBlocked ? `${t.tasksBlocked} blocked` : undefined}
          tone={t.tasksBlocked ? 'warn' : 'default'}
        />
      </div>

      {needsAttention && (
        <div className="grid gap-4 lg:grid-cols-3">
          {pending.length > 0 && (
            <Card title={`Leave to approve (${pending.length})`} bodyClassName="divide-y divide-borderBase">
              {pending.slice(0, 6).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 text-sm">
                    <Link to={`/employees/${l.employee.id}`} className="font-medium text-secondary hover:text-primary">{l.employee.name}</Link>
                    <p className="truncate text-xs text-tertiary">{l.leaveType} · {describeLeave(l)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => decide(l.id, 'APPROVED')} disabled={deciding === l.id} aria-label={`Approve ${l.employee.name}'s leave`} title="Approve" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
                      <Check size={16} />
                    </button>
                    <button onClick={() => decide(l.id, 'REJECTED')} disabled={deciding === l.id} aria-label={`Reject ${l.employee.name}'s leave`} title="Reject" className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {pending.length > 6 && (
                <Link to="/leaves" className="block px-5 py-2.5 text-xs font-medium text-primary hover:underline">See all {pending.length}</Link>
              )}
            </Card>
          )}
          {autos.length > 0 && (
            <Card title={`Automatic check-outs to review (${autos.length})`} bodyClassName="divide-y divide-borderBase">
              {autos.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 text-sm">
                    <Link to={`/employees/${a.employee.id}`} className="font-medium text-secondary hover:text-primary">{a.employee.name}</Link>
                    <p className="text-xs text-tertiary">
                      {dayLabel(dateKeyOf(a.checkIn))} · {clock(a.checkIn)}–{clock(a.checkOut)}
                    </p>
                  </div>
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setCorrecting(a)}>
                    Fix
                  </Button>
                </div>
              ))}
            </Card>
          )}
          {blocked.length > 0 && (
            <Card title={`Blocked tasks today (${blocked.length})`} bodyClassName="divide-y divide-borderBase">
              {blocked.slice(0, 6).map(({ employee, task }) => (
                <div key={task.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-secondary">{task.taskName}</p>
                  <p className="text-xs text-tertiary">
                    {employee.name}
                    {task.remarks && ` · ${task.remarks}`}
                  </p>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All (${t.people})` },
              { value: 'in', label: `In (${t.working + t.onBreak})` },
              { value: 'not_in', label: `Not in (${t.absent})` },
              { value: 'leave', label: 'On leave' },
            ]}
          />
          <label className="relative block sm:w-64">
            <span className="sr-only">Search people</span>
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              className="w-full rounded-lg border border-borderBase bg-surface py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        {entries.length === 0 ? (
          <EmptyState title="Nobody here">No one matches this filter.</EmptyState>
        ) : (
          <PersonDayList entries={entries} expanded={expanded} onToggle={toggle} live renderActions={actions} onChanged={load} />
        )}
      </div>

      <CorrectCheckOutModal attendance={correcting} onClose={() => setCorrecting(null)} onSaved={load} />
    </div>
  );
}

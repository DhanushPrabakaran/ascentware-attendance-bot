import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { DayReport } from '../lib/types';
import { addDays, dayLabel, formatMinutes, todayKey } from '../lib/format';
import { useAuth } from '../lib/auth';
import { EmptyState, ErrorBanner, Loading, PageHeader, Segmented, Stat } from '../components/ui/Page';
import { Button } from '../components/ui/Button';
import { PersonDayList, correctableDay, type PersonDayEntry } from '../components/work/PersonDayList';
import { CorrectCheckOutModal, type CorrectableDay } from '../components/CorrectCheckOutModal';

type Filter = 'all' | 'worked' | 'tasks' | 'blocked' | 'absent';

/** Any day's work for everyone you can see: hours, breaks, and every task with its
 *  estimate, time spent, status and notes. */
export default function WorkLog() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || todayKey();
  const [report, setReport] = useState<DayReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [correcting, setCorrecting] = useState<CorrectableDay | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const day = await api.reports.day(date);
      setReport(day);
      setError(null);
      // Open everyone who has something to show, so the page reads as a log.
      setExpanded(new Set(day.people.filter((p) => p.day.checkIn || p.day.tasks.length).map((p) => p.employee.id)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load the work log');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const setDate = (next: string) => {
    if (next > todayKey()) return;
    setParams(next === todayKey() ? {} : { date: next });
  };

  const entries = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    return report.people.filter(({ employee, day }) => {
      if (q) {
        const hay = [employee.name, employee.email, ...day.tasks.map((t) => `${t.taskName} ${t.remarks ?? ''}`)].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === 'worked') return !!day.checkIn;
      if (filter === 'tasks') return day.tasks.length > 0;
      if (filter === 'blocked') return day.taskStats.blocked > 0;
      if (filter === 'absent') return !day.checkIn;
      return true;
    });
  }, [report, filter, query]);

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

  const exportDay = async () => {
    setExporting(true);
    try {
      await api.attendance.exportCsv({ from: date, to: date });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const isToday = date === todayKey();
  const t = report?.totals;
  const workedPeople = report?.people.filter((p) => p.day.checkIn).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work log"
        description="What everyone did on a day: hours, breaks, and each task with its estimate, time spent, status and notes."
        actions={
          <Button variant="secondary" onClick={exportDay} disabled={exporting}>
            <Download size={14} />
            {exporting ? 'Exporting…' : 'Export day'}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" className="px-2.5" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeft size={16} />
        </Button>
        <label className="sr-only" htmlFor="worklog-date">Date</label>
        <input
          id="worklog-date"
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="rounded-lg border border-borderBase bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button variant="secondary" className="px-2.5" onClick={() => setDate(addDays(date, 1))} disabled={isToday} aria-label="Next day">
          <ChevronRight size={16} />
        </Button>
        {!isToday && (
          <Button variant="secondary" onClick={() => setDate(todayKey())}>
            Today
          </Button>
        )}
        <span className="ml-1 text-sm font-semibold text-secondary">{dayLabel(date, { weekday: 'long' })}</span>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {loading && !report ? (
        <Loading />
      ) : report && t ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="People who worked" value={`${workedPeople}/${t.people}`} hint={t.onLeave ? `${t.onLeave} on leave` : undefined} />
            <Stat label="Total hours" value={formatMinutes(t.workedMinutes)} hint={workedPeople ? `${formatMinutes(Math.round(t.workedMinutes / workedPeople))} per person` : undefined} />
            <Stat label="Tasks done" value={t.tasksPlanned ? `${t.tasksCompleted}/${t.tasksPlanned}` : '—'} tone="good" />
            <Stat label="Blocked" value={t.tasksBlocked} tone={t.tasksBlocked ? 'bad' : 'muted'} hint={t.late ? `${t.late} late check-in${t.late === 1 ? '' : 's'}` : undefined} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Segmented
              label="Show"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Everyone' },
                { value: 'worked', label: 'Worked' },
                { value: 'tasks', label: 'With tasks' },
                { value: 'blocked', label: 'Blocked' },
                { value: 'absent', label: 'Did not work' },
              ]}
            />
            <div className="flex items-center gap-2">
              <label className="relative block sm:w-64">
                <span className="sr-only">Search people or tasks</span>
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people or tasks"
                  className="w-full rounded-lg border border-borderBase bg-surface py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <button
                type="button"
                onClick={() => setExpanded(expanded.size ? new Set() : new Set(entries.map((e) => e.employee.id)))}
                className="whitespace-nowrap text-xs font-medium text-primary hover:underline"
              >
                {expanded.size ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          </div>

          {entries.length === 0 ? (
            <EmptyState title="Nothing to show">No one matches this filter on {dayLabel(date)}.</EmptyState>
          ) : (
            <PersonDayList entries={entries} expanded={expanded} onToggle={toggle} live={isToday} renderActions={actions} />
          )}
        </>
      ) : null}

      <CorrectCheckOutModal attendance={correcting} onClose={() => setCorrecting(null)} onSaved={load} />
    </div>
  );
}

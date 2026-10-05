import { Fragment, useState } from 'react';
import { Pencil } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { DayTask } from '../../lib/types';
import { dayLabel, formatMinutes } from '../../lib/format';
import { Button } from '../ui/Button';
import { PriorityLabel, TaskStatusBadge } from './status';

const URL_RE = /^https?:\/\/\S+$/i;

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Done' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'not_started', label: 'Not started' },
];

const FIELD_LABEL: Record<string, string> = { status: 'status', timeTakenMinutes: 'time spent', remarks: 'notes' };

function TaskName({ task }: { task: DayTask }) {
  const trimmed = task.taskName.trim();
  const name = URL_RE.test(trimmed) ? (
    <a href={trimmed} target="_blank" rel="noreferrer" className="break-all font-medium text-primary hover:underline">
      {trimmed.replace(/^https?:\/\//i, '')}
    </a>
  ) : (
    <span className="font-medium text-secondary">{trimmed}</span>
  );
  return (
    <>
      {name}
      {task.carriedFromDate && (
        <span className="ml-2 whitespace-nowrap text-[11px] text-tertiary">↪ from {dayLabel(task.carriedFromDate)}</span>
      )}
    </>
  );
}

/** Spent vs estimate, coloured when it ran well over. */
function Spent({ task }: { task: DayTask }) {
  if (!task.timeTakenMinutes) return <span className="text-tertiary">—</span>;
  const over = task.estimatedMinutes > 0 && task.timeTakenMinutes > task.estimatedMinutes * 1.25;
  return (
    <span className={over ? 'font-medium text-amber-700' : 'text-secondary'} title={over ? 'Took noticeably longer than estimated' : undefined}>
      {formatMinutes(task.timeTakenMinutes)}
    </span>
  );
}

/**
 * The task's state as of now. A task left "not started" on a finished day was never
 * reviewed at check-out - say that, rather than implying nobody touched it. A task
 * carried into a later day points there instead.
 */
function Status({ task, dayOpen }: { task: DayTask; dayOpen: boolean }) {
  if (task.carriedToDate && task.status !== 'completed') {
    return (
      <span className="inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
        Moved to {dayLabel(task.carriedToDate)}
      </span>
    );
  }
  if (task.status === 'not_started') {
    return dayOpen ? (
      <span className="text-xs text-tertiary">Planned</span>
    ) : (
      <span
        className="inline-flex whitespace-nowrap rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20"
        title="No update was given for this task at check-out"
      >
        Not reviewed
      </span>
    );
  }
  return <TaskStatusBadge status={task.status} />;
}

function describeChange(field: string, [before, after]: [unknown, unknown]) {
  const show = (v: unknown) =>
    v === null || v === undefined || v === ''
      ? 'empty'
      : field === 'timeTakenMinutes'
        ? formatMinutes(Number(v))
        : field === 'status'
          ? (STATUS_OPTIONS.find((o) => o.value === v)?.label ?? String(v))
          : `"${String(v)}"`;
  return `${FIELD_LABEL[field] ?? field} ${show(before)} → ${show(after)}`;
}

function EditedNote({ task }: { task: DayTask }) {
  if (!task.edits?.length) return null;
  const last = task.edits[0];
  const history = task.edits
    .map(
      (e) =>
        `${new Date(e.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} by ${e.by}: ` +
        Object.entries(e.changes)
          .map(([f, c]) => describeChange(f, c))
          .join(', '),
    )
    .join('\n');
  return (
    <span className="block text-[11px] text-tertiary" title={history}>
      Updated later by {last.by}, {new Date(last.at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
      {task.edits.length > 1 ? ` (${task.edits.length} changes)` : ''}
    </span>
  );
}

function EditForm({ task, onCancel, onSaved }: { task: DayTask; onCancel: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(task.status === 'not_started' ? 'completed' : task.status);
  const [hours, setHours] = useState(String(Math.floor(task.timeTakenMinutes / 60)));
  const [minutes, setMinutes] = useState(String(task.timeTakenMinutes % 60));
  const [remarks, setRemarks] = useState(task.remarks ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = 'rounded-lg border border-borderBase bg-surface px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.reports.editTask(task.id, {
        status,
        timeTakenMinutes: (Number(hours) || 0) * 60 + (Number(minutes) || 0),
        remarks: remarks.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-tertiary">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`mt-1 block ${field}`}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <fieldset className="text-xs text-tertiary">
          <legend>Time spent</legend>
          <div className="mt-1 flex items-center gap-1">
            <input aria-label="Hours" type="number" min={0} max={24} value={hours} onChange={(e) => setHours(e.target.value)} className={`w-16 ${field}`} />
            <span>h</span>
            <input aria-label="Minutes" type="number" min={0} max={59} step={5} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={`w-16 ${field}`} />
            <span>m</span>
          </div>
        </fieldset>
        <label className="min-w-[12rem] flex-1 text-xs text-tertiary">
          Notes
          <input value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={1000} placeholder="What happened with it?" className={`mt-1 block w-full ${field}`} />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" className="px-3 py-1.5 text-xs" disabled={saving}>{saving ? 'Saving…' : 'Save update'}</Button>
        <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={onCancel} disabled={saving}>Cancel</Button>
        <span className="text-[11px] text-tertiary">The change is recorded with your name and the time.</span>
      </div>
    </form>
  );
}

/** A day's planned tasks with how each one went - editable when `canEdit`. */
export function TaskTable({
  tasks,
  dayOpen = false,
  canEdit = false,
  onEdited,
}: {
  tasks: DayTask[];
  /** The day is still running - unreviewed tasks are just "planned". */
  dayOpen?: boolean;
  canEdit?: boolean;
  onEdited?: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  if (tasks.length === 0) {
    return <p className="py-3 text-sm text-tertiary">No tasks planned.</p>;
  }
  // Updating today's tasks happens at check-out in Teams; the web is for after the fact.
  const editable = canEdit && !dayOpen;
  const saved = () => {
    setEditing(null);
    onEdited?.();
  };
  const editButton = (t: DayTask) =>
    editable && editing !== t.id ? (
      <button
        type="button"
        onClick={() => setEditing(t.id)}
        className="rounded-md p-1 text-tertiary hover:bg-surfaceHover hover:text-primary"
        aria-label={`Update "${t.taskName}"`}
        title="Update status, time or notes"
      >
        <Pencil size={14} />
      </button>
    ) : null;

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borderBase text-left text-xs font-medium text-tertiary">
              <th className="w-8 py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-4 font-medium">Task</th>
              <th className="py-2 pr-4 font-medium">Priority</th>
              <th className="py-2 pr-4 text-right font-medium">Estimate</th>
              <th className="py-2 pr-4 text-right font-medium">Spent</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Notes</th>
              {editable && <th className="w-8 py-2"><span className="sr-only">Update</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-borderBase">
            {tasks.map((t, i) => (
              <Fragment key={t.id}>
                <tr className="align-top">
                  <td className="py-2.5 pr-2 tabular-nums text-tertiary">{i + 1}</td>
                  <td className="py-2.5 pr-4">
                    <TaskName task={t} />
                    <EditedNote task={t} />
                  </td>
                  <td className="py-2.5 pr-4"><PriorityLabel priority={t.priority} /></td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-secondary/80">
                    {t.estimatedMinutes ? formatMinutes(t.estimatedMinutes) : '—'}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums"><Spent task={t} /></td>
                  <td className="py-2.5 pr-4"><Status task={t} dayOpen={dayOpen} /></td>
                  <td className="py-2.5 text-secondary/80">{t.remarks || <span className="text-tertiary">—</span>}</td>
                  {editable && <td className="py-1.5 text-right">{editButton(t)}</td>}
                </tr>
                {editing === t.id && (
                  <tr>
                    <td colSpan={editable ? 8 : 7} className="pb-3">
                      <EditForm task={t} onCancel={() => setEditing(null)} onSaved={saved} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-borderBase md:hidden">
        {tasks.map((t, i) => (
          <li key={t.id} className="space-y-1.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm">
                <span className="mr-1.5 tabular-nums text-tertiary">{i + 1}.</span>
                <TaskName task={t} />
                <EditedNote task={t} />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Status task={t} dayOpen={dayOpen} />
                {editButton(t)}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tertiary">
              <PriorityLabel priority={t.priority} />
              <span>Est. {t.estimatedMinutes ? formatMinutes(t.estimatedMinutes) : '—'}</span>
              <span>Spent <Spent task={t} /></span>
            </div>
            {t.remarks && <p className="text-sm text-secondary/80">{t.remarks}</p>}
            {editing === t.id && <EditForm task={t} onCancel={() => setEditing(null)} onSaved={saved} />}
          </li>
        ))}
      </ul>
    </>
  );
}

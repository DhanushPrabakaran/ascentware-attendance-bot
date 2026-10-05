import type { DayTask } from '../../lib/types';
import { formatMinutes } from '../../lib/format';
import { PriorityLabel, TaskStatusBadge } from './status';

const URL_RE = /^https?:\/\/\S+$/i;

function TaskName({ name }: { name: string }) {
  const trimmed = name.trim();
  if (URL_RE.test(trimmed)) {
    return (
      <a href={trimmed} target="_blank" rel="noreferrer" className="break-all font-medium text-primary hover:underline">
        {trimmed.replace(/^https?:\/\//i, '')}
      </a>
    );
  }
  return <span className="font-medium text-secondary">{trimmed}</span>;
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

/** A day's planned tasks with how each one went. */
export function TaskTable({ tasks, reviewed = true }: { tasks: DayTask[]; reviewed?: boolean }) {
  if (tasks.length === 0) {
    return <p className="py-3 text-sm text-tertiary">No tasks planned.</p>;
  }
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
            </tr>
          </thead>
          <tbody className="divide-y divide-borderBase">
            {tasks.map((t, i) => (
              <tr key={t.id} className="align-top">
                <td className="py-2.5 pr-2 tabular-nums text-tertiary">{i + 1}</td>
                <td className="py-2.5 pr-4"><TaskName name={t.taskName} /></td>
                <td className="py-2.5 pr-4"><PriorityLabel priority={t.priority} /></td>
                <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-secondary/80">
                  {t.estimatedMinutes ? formatMinutes(t.estimatedMinutes) : '—'}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums"><Spent task={t} /></td>
                <td className="py-2.5 pr-4">
                  {reviewed || t.status !== 'not_started' ? <TaskStatusBadge status={t.status} /> : <span className="text-xs text-tertiary">Planned</span>}
                </td>
                <td className="py-2.5 text-secondary/80">{t.remarks || <span className="text-tertiary">—</span>}</td>
              </tr>
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
                <TaskName name={t.taskName} />
              </div>
              {reviewed || t.status !== 'not_started' ? <TaskStatusBadge status={t.status} /> : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tertiary">
              <PriorityLabel priority={t.priority} />
              <span>Est. {t.estimatedMinutes ? formatMinutes(t.estimatedMinutes) : '—'}</span>
              <span>Spent <Spent task={t} /></span>
            </div>
            {t.remarks && <p className="text-sm text-secondary/80">{t.remarks}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

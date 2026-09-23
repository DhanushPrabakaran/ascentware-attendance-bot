import type { DailyTask } from '../lib/types';
import { Badge, statusToVariant } from './ui/Badge';

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
};

/** Shown inline under an attendance record so anyone viewing that day (the employee
 *  themselves, or a manager/HR/admin looking them up) can see what was planned, its
 *  current status, and any remarks - not just the check-in/out times. */
export function DailyTasksPanel({ tasks }: { tasks?: DailyTask[] }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-4 text-sm text-secondary/40 text-center">
        No planned tasks for this day.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="p-3 bg-background rounded-lg border border-borderBase"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-semibold text-secondary">{task.taskName}</span>
            <Badge variant={statusToVariant(task.status)}>
              {STATUS_LABELS[task.status] || task.status}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-secondary/50">
            Estimated: {task.estimatedMinutes} min
            {task.timeTakenMinutes > 0 && ` · Taken: ${task.timeTakenMinutes} min`}
            {task.priority && task.priority !== 'normal' && ` · Priority: ${task.priority}`}
          </div>
          {task.remarks && (
            <p className="mt-2 text-sm text-secondary/70">{task.remarks}</p>
          )}
        </div>
      ))}
    </div>
  );
}

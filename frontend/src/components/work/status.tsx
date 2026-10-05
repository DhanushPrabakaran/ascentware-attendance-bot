import type { DayState } from '../../lib/types';

const DAY_STATE: Record<DayState, { label: string; dot: string; pill: string }> = {
  working: { label: 'Working', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  on_break: { label: 'On break', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
  checked_out: { label: 'Checked out', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
  on_leave: { label: 'On leave', dot: 'bg-violet-500', pill: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
  absent: { label: 'Not checked in', dot: 'bg-gray-300', pill: 'bg-gray-50 text-gray-600 ring-gray-500/20' },
};

export function DayStatePill({ state, label }: { state: DayState; label?: string }) {
  const meta = DAY_STATE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {label ?? meta.label}
    </span>
  );
}

export const dayStateLabel = (state: DayState) => DAY_STATE[state].label;

const TASK_STATUS: Record<string, { label: string; className: string }> = {
  completed: { label: 'Done', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  in_progress: { label: 'In progress', className: 'bg-sky-50 text-sky-700 ring-sky-600/20' },
  blocked: { label: 'Blocked', className: 'bg-red-50 text-red-700 ring-red-600/20' },
  not_started: { label: 'Not started', className: 'bg-gray-50 text-gray-600 ring-gray-500/20' },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const meta = TASK_STATUS[status] ?? { label: status, className: 'bg-gray-50 text-gray-600 ring-gray-500/20' };
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}>
      {meta.label}
    </span>
  );
}

const PRIORITY: Record<string, { label: string; className: string }> = {
  'Important / High': { label: 'High', className: 'text-red-600' },
  high: { label: 'High', className: 'text-red-600' },
  Low: { label: 'Low', className: 'text-tertiary' },
  low: { label: 'Low', className: 'text-tertiary' },
};

export function PriorityLabel({ priority }: { priority: string }) {
  const meta = PRIORITY[priority] ?? { label: 'Normal', className: 'text-secondary/70' };
  return <span className={`text-xs font-medium ${meta.className}`}>{meta.label}</span>;
}

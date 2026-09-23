import { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-primary/10 text-primary border-primary/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  info: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  neutral: 'bg-tertiary/10 text-tertiary border-tertiary/20',
};

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}

/** Maps the raw status strings used across leaves/attendance/employees to a Badge variant. */
export function statusToVariant(status: string): BadgeVariant {
  switch (status) {
    case 'APPROVED':
    case 'checked_in':
    case 'active':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
    case 'LATE':
    case 'inactive':
      return 'danger';
    case 'PENDING':
    case 'on_break':
    case 'ON_BREAK':
    case 'in_progress':
      return 'warning';
    case 'completed':
      return 'success';
    case 'not_started':
      return 'neutral';
    default:
      return 'neutral';
  }
}

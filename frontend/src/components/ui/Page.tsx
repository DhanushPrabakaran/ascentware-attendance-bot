import type { ReactNode } from 'react';
import { initials } from '../../lib/format';

/** Title row every page starts with. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-tight text-secondary">{title}</h2>
        {description && <p className="mt-1 text-sm text-tertiary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className = '',
  bodyClassName = 'p-5',
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`rounded-xl border border-borderBase bg-surface shadow-saas ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-borderBase px-5 py-3.5">
          {title && <h3 className="text-sm font-semibold text-secondary">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

const statTones = {
  default: 'text-secondary',
  primary: 'text-primary',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
  muted: 'text-tertiary',
} as const;

/** A labelled number. */
export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: keyof typeof statTones;
}) {
  return (
    <div className="rounded-xl border border-borderBase bg-surface px-4 py-3.5 shadow-saas">
      <div className="text-xs font-medium text-tertiary">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${statTones[tone]}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-tertiary">{hint}</div>}
    </div>
  );
}

const avatarColors = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-lg' };
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${avatarColors[hash % avatarColors.length]}`}
    >
      {initials(name)}
    </span>
  );
}

/** A horizontal bar showing `value` of `max`. */
export function Progress({
  value,
  max,
  tone = 'primary',
  label,
}: {
  value: number;
  max: number;
  tone?: 'primary' | 'good' | 'warn';
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colors = { primary: 'bg-primary', good: 'bg-emerald-500', warn: 'bg-amber-500' };
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surfaceHover"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Pill-style single choice (period pickers, filters). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-borderBase bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === o.value ? 'bg-primary text-white shadow-sm' : 'text-tertiary hover:text-secondary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-borderBase bg-surface px-6 py-12 text-center">
      <p className="text-sm font-semibold text-secondary">{title}</p>
      {children && <p className="mt-1 text-sm text-tertiary">{children}</p>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-surfaceHover" />
      ))}
    </div>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </div>
  );
}

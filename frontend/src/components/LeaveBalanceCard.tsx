import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { LeaveBalance } from '../lib/types';
import { formatMinutes } from '../lib/format';

/** This year's leave per type: days used against the allowance, hours of permission. */
export function LeaveBalanceCard({
  employeeId,
  refreshKey,
}: {
  employeeId?: string;
  /** Change it to reload, e.g. after applying for or cancelling leave. */
  refreshKey?: unknown;
}) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);

  useEffect(() => {
    api.leaves
      .balance(employeeId ? { employeeId } : {})
      .then(setBalance)
      .catch(() => setBalance(null));
  }, [employeeId, refreshKey]);

  if (!balance || balance.types.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-secondary mb-3">Leave in {balance.year}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {balance.types.map((t) => {
          const hourly = t.annualDays === null && t.usedDays === 0 && t.pendingDays === 0;
          const pct =
            t.annualDays && t.annualDays > 0 ? Math.min(100, (t.usedDays / t.annualDays) * 100) : 0;
          return (
            <div key={t.leaveType} className="bg-surface border border-borderBase rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-secondary/50">
                {t.leaveType}
              </div>
              {hourly ? (
                <div className="mt-1 text-xl font-bold text-secondary">{formatMinutes(t.usedMinutes)}</div>
              ) : t.annualDays !== null ? (
                <>
                  <div className="mt-1 text-xl font-bold text-secondary">
                    {t.remainingDays}
                    <span className="text-sm font-medium text-secondary/50"> of {t.annualDays} days left</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden" aria-hidden>
                    <div
                      className={`h-full rounded-full ${t.remainingDays !== null && t.remainingDays < 0 ? 'bg-red-400' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-1 text-xl font-bold text-secondary">
                  {t.usedDays}
                  <span className="text-sm font-medium text-secondary/50"> days used</span>
                </div>
              )}
              {(t.pendingDays > 0 || t.pendingMinutes > 0 || (hourly ? false : t.usedMinutes > 0)) && (
                <div className="mt-2 text-xs text-secondary/50">
                  {[
                    t.pendingDays > 0 && `${t.pendingDays} day(s) pending`,
                    t.pendingMinutes > 0 && `${formatMinutes(t.pendingMinutes)} pending`,
                    !hourly && t.usedMinutes > 0 && `+ ${formatMinutes(t.usedMinutes)} in hours`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

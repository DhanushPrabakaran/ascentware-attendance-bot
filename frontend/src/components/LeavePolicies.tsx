import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { LeavePolicy } from '../lib/types';
import { Button } from './ui/Button';

const LEAVE_TYPES = ['Sick', 'Personal', 'Earned'];

const inputClass =
  'block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors';

/** Admin: yearly day allowance per leave type. Types without one are unlimited. */
export function LeavePolicies() {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [days, setDays] = useState('12');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.leaves.policies().then(setPolicies).catch(() => undefined);
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.leaves.setPolicy({ leaveType, annualDays: Number(days) });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save allowance');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (type: string) => {
    if (!window.confirm(`Remove the ${type} allowance? ${type} leave becomes unlimited.`)) return;
    await api.leaves.deletePolicy(type);
    await load();
  };

  return (
    <div className="bg-surface border border-borderBase rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-secondary">Yearly leave allowance</h3>
        <p className="text-sm text-secondary/60">
          Days per calendar year, counted on working days. Managers see the balance on the
          Teams approval card and employees see it on their dashboard. Requests over the
          allowance aren't blocked.
        </p>
      </div>
      {policies.length > 0 && (
        <ul className="divide-y divide-borderBase border border-borderBase rounded-lg">
          {policies.map((p) => (
            <li key={p.leaveType} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-secondary font-medium">{p.leaveType}</span>
              <span className="flex items-center gap-4">
                <span className="text-secondary/70">{p.annualDays} days</span>
                <button
                  onClick={() => remove(p.leaveType)}
                  aria-label={`Remove ${p.leaveType} allowance`}
                  title="Remove"
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <div className="text-sm text-red-400">{error}</div>}
      <form onSubmit={save} className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label htmlFor="policy-type" className="block text-sm font-semibold text-secondary/80 mb-1">
            Leave type
          </label>
          <select id="policy-type" value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className={inputClass}>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-32">
          <label htmlFor="policy-days" className="block text-sm font-semibold text-secondary/80 mb-1">
            Days / year
          </label>
          <input
            id="policy-days"
            required
            type="number"
            min={0}
            max={366}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={inputClass}
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Set allowance'}
        </Button>
      </form>
    </div>
  );
}

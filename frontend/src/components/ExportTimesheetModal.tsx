import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

const inputClass =
  'block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Downloads a timesheet CSV - this month by default - for everyone the user can see,
 *  or one employee when `employeeId` is given. */
export function ExportTimesheetModal({
  open,
  onClose,
  employeeId,
}: {
  open: boolean;
  onClose: () => void;
  employeeId?: string;
}) {
  const now = new Date();
  const [from, setFrom] = useState(ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(ymd(now));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setMonth = (offset: number) => {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    setFrom(ymd(first));
    setTo(ymd(offset === 0 ? now : last));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.attendance.exportCsv({ from, to, employeeId });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Export Timesheet">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-secondary/70">
          A CSV with one row per day worked: check-in/out, worked hours, breaks, lunch,
          permission and tasks. Opens in Excel or Google Sheets.
        </p>
        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-medium">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setMonth(0)}>
            This month
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMonth(-1)}>
            Last month
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="export-from" className="block text-sm font-semibold text-secondary/80 mb-1">
              From
            </label>
            <input id="export-from" required type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="export-to" className="block text-sm font-semibold text-secondary/80 mb-1">
              To
            </label>
            <input id="export-to" required type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-6 border-t border-borderBase">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !from || !to}>
            {busy ? 'Preparing...' : 'Download CSV'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

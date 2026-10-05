import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Attendance } from '../lib/types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

/** What the modal needs to know about the day - an Attendance row or a report day. */
export type CorrectableDay = Pick<Attendance, 'id' | 'checkIn' | 'checkOut' | 'autoCheckedOut'> & {
  employee?: { name: string };
};

const inputClass =
  'block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors';

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Sets the real check-out time of a finished day (e.g. one closed automatically). */
export function CorrectCheckOutModal({
  attendance,
  onClose,
  onSaved,
}: {
  attendance: CorrectableDay | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTime(attendance?.checkOut ? clock(attendance.checkOut) : '');
    setError(null);
  }, [attendance]);

  if (!attendance) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.attendance.correctCheckOut(attendance.id, time);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update check-out');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Correct Check-out">
      <form onSubmit={save} className="space-y-5">
        <p className="text-sm text-secondary/70">
          {attendance.employee?.name ? `${attendance.employee.name} · ` : ''}
          {new Date(attendance.checkIn).toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
          , checked in at {clock(attendance.checkIn)}.
          {attendance.autoCheckedOut &&
            ' This day was closed automatically because nobody checked out.'}
        </p>
        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-medium">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="checkout-time" className="block text-sm font-semibold text-secondary/80 mb-1">
            Actual check-out time
          </label>
          <input
            id="checkout-time"
            required
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-secondary/50">
            Office time, same day. Breaks after this time are cut off, and worked hours are recalculated.
          </p>
        </div>
        <div className="flex justify-end space-x-3 pt-6 border-t border-borderBase">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !time}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

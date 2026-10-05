import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { ScheduleSettings } from '../lib/types';
import { Button } from './ui/Button';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const inputClass =
  'block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors';

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-borderBase bg-surfaceHover text-primary focus:ring-primary"
      />
      <span className="text-sm">
        <span className="font-medium text-secondary">{label}</span>
        <span className="block text-secondary/50">{hint}</span>
      </span>
    </label>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-secondary/80 mb-1">
        {label}
      </label>
      <input
        id={id}
        required
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} disabled:opacity-50`}
      />
    </div>
  );
}

/** Admin: when the bot sends reminders (1:1 chats) and team digests (groups). */
export function ScheduleSettingsPanel() {
  const [form, setForm] = useState<ScheduleSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api.schedule
      .get()
      .then(setForm)
      .catch(() => setMessage({ ok: false, text: 'Failed to load schedule settings' }));
  }, []);

  if (!form) {
    return message ? <div className="text-sm text-red-400">{message.text}</div> : null;
  }

  const set = <K extends keyof ScheduleSettings>(key: K, value: ScheduleSettings[K]) =>
    setForm({ ...form, [key]: value });

  const toggleDay = (day: number) =>
    set(
      'workingDays',
      form.workingDays.includes(day)
        ? form.workingDays.filter((d) => d !== day)
        : [...form.workingDays, day].sort((a, b) => a - b),
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      setForm(await api.schedule.update(form));
      setMessage({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="bg-surface border border-borderBase rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary">Reminders & daily digests</h3>
        <p className="text-sm text-secondary/60">
          Office time. Reminders go to each person's 1:1 chat with the bot, so they start once
          that person has messaged the bot at least once. Anyone with a shift is reminded 30
          minutes after their shift starts and ends, instead of at these times.
        </p>
      </div>

      <fieldset className="space-y-4">
        <Toggle
          checked={form.remindersEnabled}
          onChange={(v) => set('remindersEnabled', v)}
          label="Check-in / check-out reminders"
          hint="Nudges anyone not checked in by the morning time, and anyone still checked in at the evening time. Skipped for people on leave."
        />
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <TimeField id="checkin-reminder" label="Check-in reminder" value={form.checkInReminderTime} onChange={(v) => set('checkInReminderTime', v)} disabled={!form.remindersEnabled} />
          <TimeField id="checkout-reminder" label="Check-out reminder" value={form.checkOutReminderTime} onChange={(v) => set('checkOutReminderTime', v)} disabled={!form.remindersEnabled} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <Toggle
          checked={form.digestsEnabled}
          onChange={(v) => set('digestsEnabled', v)}
          label="Team digests in each group"
          hint="Morning: who's in, on leave or not checked in. Evening: each person's hours, tasks done and blocked tasks."
        />
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <TimeField id="morning-digest" label="Morning digest" value={form.morningDigestTime} onChange={(v) => set('morningDigestTime', v)} disabled={!form.digestsEnabled} />
          <TimeField id="evening-digest" label="Evening digest" value={form.eveningDigestTime} onChange={(v) => set('eveningDigestTime', v)} disabled={!form.digestsEnabled} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="block text-sm font-semibold text-secondary/80 mb-2">Working days</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((label, i) => {
            const day = i + 1;
            const on = form.workingDays.includes(day);
            return (
              <label
                key={day}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors focus-within:ring-1 focus-within:ring-primary ${
                  on ? 'border-primary bg-primary/10 text-secondary' : 'border-borderBase text-secondary/50 hover:text-secondary'
                }`}
              >
                <input type="checkbox" checked={on} onChange={() => toggleDay(day)} className="sr-only" />
                {label}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-secondary/50">
          No reminders or digests on other days. Leave balances count these days too.
        </p>
      </fieldset>

      <div className="flex items-center justify-end gap-4 pt-4 border-t border-borderBase">
        {message && (
          <span className={`text-sm ${message.ok ? 'text-primary' : 'text-red-400'}`} aria-live="polite">
            {message.text}
          </span>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save schedule'}
        </Button>
      </div>
    </form>
  );
}

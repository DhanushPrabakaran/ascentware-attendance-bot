import { useEffect, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Leave, PersonDay } from '../lib/types';
import { useAuth } from '../lib/auth';
import { Badge, statusToVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Card, EmptyState, PageHeader, Segmented } from '../components/ui/Page';
import { LeaveBalanceCard } from '../components/LeaveBalanceCard';
import { CorrectCheckOutModal, type CorrectableDay } from '../components/CorrectCheckOutModal';
import { ExportTimesheetModal } from '../components/ExportTimesheetModal';
import { DayDetail } from '../components/work/DayDetail';
import { DayStatePill } from '../components/work/status';
import { PersonHistory, usePersonReport, type Period } from '../components/work/PersonHistory';
import { dayLabel, describeLeave, formatMinutes, todayKey } from '../lib/format';

type LeaveMode = 'days' | 'hours';
type Tab = 'work' | 'leave';

const emptyForm = {
  leaveType: 'Sick',
  mode: 'days' as LeaveMode,
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  reason: '',
};

/** Minutes between two "HH:mm" values, or null if either is blank or To isn't after From. */
function hoursFormDuration(from: string, to: string): number | null {
  if (!from || !to) return null;
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const minutes = th * 60 + tm - (fh * 60 + fm);
  return minutes > 0 ? minutes : null;
}

/** Your own day, history and leave. */
export default function MyDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('30');
  const [tab, setTab] = useState<Tab>('work');
  const { report, error: reportError, reload } = usePersonReport(user?.id, period);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<CorrectableDay | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadLeaves = async () => {
    if (!user) return;
    const result = await api.leaves.list({ employeeId: user.id, pageSize: 100 });
    setLeaves(result.data);
  };

  useEffect(() => {
    loadLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const today = todayKey();
  // Pending any time; approved only until it starts (after that, ask an admin).
  const canCancel = (l: Leave) =>
    l.status === 'PENDING' || (l.status === 'APPROVED' && l.startDate.slice(0, 10) >= today);

  const cancelLeave = async (l: Leave) => {
    if (!window.confirm(`Cancel your ${l.leaveType} leave (${describeLeave(l)})?`)) return;
    setCancellingId(l.id);
    try {
      await api.leaves.cancel(l.id);
      await loadLeaves();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to cancel leave');
    } finally {
      setCancellingId(null);
    }
  };

  const applyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const inHours = form.mode === 'hours';
      if (inHours && hoursFormDuration(form.startTime, form.endTime) === null) {
        setError('To time must be after From time.');
        return;
      }
      await api.leaves.applyOwn({
        leaveType: form.leaveType,
        startDate: form.startDate,
        // Leave in hours is a single day.
        endDate: inHours ? form.startDate : form.endDate,
        reason: form.reason,
        ...(inHours ? { startTime: form.startTime, endTime: form.endTime } : {}),
      });
      setModalOpen(false);
      setForm(emptyForm);
      await loadLeaves();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  // Your own days: only an automatic check-out can be corrected by you.
  const dayActions = (_date: string, day: PersonDay) =>
    day.autoCheckedOut && day.checkIn && day.checkOut && day.attendanceIds.length === 1 ? (
      <Button
        variant="secondary"
        className="px-3 py-1.5 text-xs"
        onClick={() =>
          setCorrecting({ id: day.attendanceIds[0], checkIn: day.checkIn!, checkOut: day.checkOut, autoCheckedOut: true })
        }
      >
        Enter my real check-out time
      </Button>
    ) : null;

  const todayDay = report?.days.find((d) => d.date === today)?.day;
  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi, ${user?.name?.split(' ')[0] ?? ''}`}
        description={dayLabel(today, { weekday: 'long' })}
        actions={
          <>
            <Button variant="secondary" onClick={() => setExportOpen(true)}>
              <Download size={14} /> Timesheet
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Apply for leave
            </Button>
          </>
        }
      />

      <Card
        title="Today"
        actions={todayDay ? <DayStatePill state={todayDay.state} /> : undefined}
      >
        {todayDay && (todayDay.checkIn || todayDay.leaves.length) ? (
          <DayDetail day={todayDay} shift={report?.employee.shift} />
        ) : (
          <p className="text-sm text-tertiary">
            You haven't checked in today. Check in from the Ascentware bot in Teams.
          </p>
        )}
      </Card>

      <Segmented
        label="Section"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'work', label: 'My work' },
          { value: 'leave', label: pendingCount ? `My leave (${pendingCount} pending)` : 'My leave' },
        ]}
      />

      {tab === 'work' ? (
        <PersonHistory report={report} error={reportError} period={period} onPeriodChange={setPeriod} dayActions={dayActions} excludeToday />
      ) : (
        <div className="space-y-5">
          <LeaveBalanceCard refreshKey={leaves} />
          {leaves.length === 0 ? (
            <EmptyState title="No leave requests yet">Use "Apply for leave" to request a day off or a few hours.</EmptyState>
          ) : (
            <Card bodyClassName="divide-y divide-borderBase">
              {leaves.map((l) => (
                <div key={l.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-secondary">
                      {l.leaveType} · {describeLeave(l)}
                      {l.durationMinutes ? <span className="text-tertiary"> ({formatMinutes(l.durationMinutes)})</span> : null}
                    </p>
                    <p className="truncate text-xs text-tertiary">{l.reason}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusToVariant(l.status)}>{l.status.toLowerCase()}</Badge>
                    {canCancel(l) && (
                      <button
                        onClick={() => cancelLeave(l)}
                        disabled={cancellingId === l.id}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        {cancellingId === l.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      <CorrectCheckOutModal attendance={correcting} onClose={() => setCorrecting(null)} onSaved={reload} />
      <ExportTimesheetModal open={exportOpen} onClose={() => setExportOpen(false)} employeeId={user?.id} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Apply for Leave">
        {error && (
          <div className="mb-4 bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-medium">
            {error}
          </div>
        )}
        <form onSubmit={applyLeave} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">Leave Type</label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
            >
              <option value="Sick">Sick Leave</option>
              <option value="Personal">Personal Leave</option>
              <option value="Earned">Earned Leave</option>
              <option value="Permission">Permission</option>
            </select>
          </div>
          <fieldset>
            <legend className="block text-sm font-semibold text-secondary/80 mb-2">Duration</legend>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['days', 'Full day(s)'],
                ['hours', 'Few hours'],
              ] as const).map(([mode, label]) => (
                <label
                  key={mode}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors focus-within:ring-1 focus-within:ring-primary ${
                    form.mode === mode
                      ? 'border-primary bg-primary/10 text-secondary'
                      : 'border-borderBase text-secondary/60 hover:text-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="leaveMode"
                    value={mode}
                    checked={form.mode === mode}
                    onChange={() => setForm({ ...form, mode })}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {form.mode === 'hours' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-secondary/80 mb-1">Date</label>
                <input
                  required
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-secondary/80 mb-1">From</label>
                  <input
                    required
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-secondary/80 mb-1">To</label>
                  <input
                    required
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
                  />
                </div>
              </div>
              {form.startTime && form.endTime && (
                <p className="text-sm" aria-live="polite">
                  {hoursFormDuration(form.startTime, form.endTime) !== null ? (
                    <span className="text-secondary/60">
                      Total: {formatMinutes(hoursFormDuration(form.startTime, form.endTime))}
                    </span>
                  ) : (
                    <span className="text-red-400">To time must be after From time.</span>
                  )}
                </p>
              )}
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-secondary/80 mb-1">Start Date</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary/80 mb-1">End Date</label>
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                min={form.startDate || undefined}
                className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
              />
            </div>
          </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">Reason</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
              placeholder="e.g. Doctor appointment"
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-borderBase">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

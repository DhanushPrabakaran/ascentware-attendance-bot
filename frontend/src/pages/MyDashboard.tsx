import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Attendance, Leave } from '../lib/types';
import { useAuth } from '../lib/auth';
import { DataList, type DataListColumn } from '../components/ui/DataList';
import { Badge, statusToVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

const emptyForm = { leaveType: 'Sick', startDate: '', endDate: '', reason: '' };

export default function MyDashboard() {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [atts, lvs] = await Promise.all([api.attendance.list(), api.leaves.list()]);
    setAttendances(atts.filter((a) => a.employeeId === user.id));
    setLeaves(lvs.filter((l) => l.employeeId === user.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const applyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.leaves.applyOwn(form);
      setModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const attendanceColumns: DataListColumn<Attendance>[] = [
    { header: 'Date', render: (a) => new Date(a.date).toLocaleDateString() },
    {
      header: 'Check In',
      render: (a) => new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      header: 'Check Out',
      render: (a) =>
        a.checkOut
          ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '--:--',
    },
    {
      header: 'Hours',
      render: (a) => (a.workingMinutes > 0 ? (a.workingMinutes / 60).toFixed(1) + 'h' : '--'),
    },
  ];

  const leaveColumns: DataListColumn<Leave>[] = [
    {
      header: 'Leave',
      render: (l) => (
        <div>
          <div className="text-sm font-semibold text-secondary">{l.leaveType}</div>
          <div className="text-xs text-secondary/50">
            {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    { header: 'Reason', render: (l) => <span className="text-secondary/70">{l.reason}</span> },
    { header: 'Status', render: (l) => <Badge variant={statusToVariant(l.status)}>{l.status}</Badge> },
  ];

  if (loading) return <div className="p-8 text-secondary/60 animate-pulse">Loading your dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-secondary tracking-tight">
            Welcome, {user?.name?.split(' ')[0]}
          </h2>
          <p className="mt-2 text-sm text-secondary/60 font-medium">
            Your attendance history and leave requests.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Apply for Leave
        </Button>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-secondary mb-3">My Leave Requests</h3>
        <DataList
          columns={leaveColumns}
          rows={leaves}
          rowKey={(l) => l.id}
          emptyMessage="You haven't applied for any leave yet."
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-secondary mb-3">My Attendance History</h3>
        <DataList
          columns={attendanceColumns}
          rows={attendances}
          rowKey={(a) => a.id}
          emptyMessage="No attendance records yet."
        />
      </div>

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
            </select>
          </div>
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
                className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
              />
            </div>
          </div>
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

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Mail } from 'lucide-react';
import { api } from '../lib/api';
import type { Leave, PersonDay } from '../lib/types';
import { describeLeave, todayKey } from '../lib/format';
import { useAuth } from '../lib/auth';
import { Avatar, Card, EmptyState, ErrorBanner, Segmented } from '../components/ui/Page';
import { Badge, statusToVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DayStatePill } from '../components/work/status';
import { PersonHistory, usePersonReport, type Period } from '../components/work/PersonHistory';
import { LeaveBalanceCard } from '../components/LeaveBalanceCard';
import { CorrectCheckOutModal, type CorrectableDay } from '../components/CorrectCheckOutModal';
import { ExportTimesheetModal } from '../components/ExportTimesheetModal';

type Tab = 'work' | 'leave';

/** One person: who they are, how their days went, and their leave. */
export default function EmployeeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('30');
  const [tab, setTab] = useState<Tab>('work');
  const { report, error, reload } = usePersonReport(id, period);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [correcting, setCorrecting] = useState<CorrectableDay | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.leaves
      .list({ employeeId: id, pageSize: 100 })
      .then((r) => setLeaves(r.data))
      .catch(() => setLeaves([]));
  }, [id]);

  if (error && !report) {
    return (
      <div className="space-y-4">
        <ErrorBanner>{error}</ErrorBanner>
        <Link to="/people" className="text-sm font-medium text-primary hover:underline">Back to people</Link>
      </div>
    );
  }

  const employee = report?.employee;
  const today = report?.days.find((d) => d.date === todayKey())?.day;
  const isSelf = id === user?.id;

  const dayActions = (_date: string, day: PersonDay) => {
    if (!day.checkIn || !day.checkOut || day.attendanceIds.length !== 1) return null;
    if (isSelf && !day.autoCheckedOut && user?.role !== 'ADMIN') return null;
    return (
      <Button
        variant="secondary"
        className="px-3 py-1.5 text-xs"
        onClick={() =>
          setCorrecting({
            id: day.attendanceIds[0],
            checkIn: day.checkIn!,
            checkOut: day.checkOut,
            autoCheckedOut: day.autoCheckedOut,
            employee: employee ? { name: employee.name } : undefined,
          })
        }
      >
        Correct check-out
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <Link to="/people" className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-primary">
        <ArrowLeft size={14} /> People
      </Link>

      {employee && (
        <Card bodyClassName="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={employee.name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-secondary">{employee.name}</h2>
                <DayStatePill state={today?.state ?? 'absent'} label={today ? undefined : 'Not checked in today'} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-tertiary">
                <span className="inline-flex items-center gap-1.5"><Mail size={13} />{employee.email}</span>
                <span>{employee.role === 'EMPLOYEE' ? 'Employee' : employee.role === 'HR' ? 'HR' : 'Admin'}</span>
                {employee.shift && <span>{employee.shift.name} shift · {employee.shift.startTime}–{employee.shift.endTime}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {employee.managerEmails.length > 0 && (
                  <span className="rounded-md bg-surfaceHover px-2 py-0.5 text-secondary/80">Reports to {employee.managerEmails.join(', ')}</span>
                )}
                {employee.groups?.map((g) => (
                  <span key={g.id} className="rounded-md bg-sky-50 px-2 py-0.5 text-sky-700">{g.name}</span>
                ))}
                <span className={`rounded-md px-2 py-0.5 ${employee.teamsUserId ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                  {employee.teamsUserId ? 'Linked to Teams' : 'Not linked to Teams'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Segmented
        label="Section"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'work', label: 'Work' },
          { value: 'leave', label: `Leave (${leaves.length})` },
        ]}
      />

      {tab === 'work' ? (
        <PersonHistory
          report={report}
          error={error}
          period={period}
          onPeriodChange={setPeriod}
          headerActions={
            <Button variant="secondary" onClick={() => setExportOpen(true)}>
              <Download size={14} /> Timesheet
            </Button>
          }
          dayActions={dayActions}
        />
      ) : (
        <div className="space-y-5">
          {id && <LeaveBalanceCard employeeId={id} refreshKey={leaves} />}
          {leaves.length === 0 ? (
            <EmptyState title="No leave requests" />
          ) : (
            <Card bodyClassName="divide-y divide-borderBase">
              {leaves.map((l) => (
                <div key={l.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary">{l.leaveType} · {describeLeave(l)}</p>
                    <p className="text-xs text-tertiary">{l.reason}</p>
                  </div>
                  <Badge variant={statusToVariant(l.status)}>{l.status.toLowerCase()}</Badge>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      <CorrectCheckOutModal attendance={correcting} onClose={() => setCorrecting(null)} onSaved={reload} />
      {id && <ExportTimesheetModal open={exportOpen} onClose={() => setExportOpen(false)} employeeId={id} />}
    </div>
  );
}

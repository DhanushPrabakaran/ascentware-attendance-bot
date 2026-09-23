import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CalendarOff, CheckCircle2, XCircle, User, Briefcase, Mail, Activity, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import type { Employee, Attendance, Leave } from '../lib/types';
import { DailyTasksPanel } from '../components/DailyTasksPanel';

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAttendanceId, setExpandedAttendanceId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Targeted, employeeId-scoped endpoints rather than fetching every employee's
      // records and filtering client-side - the server already enforces (via
      // canViewEmployeeData) whether the caller may see this specific employee, so a
      // 403/404 here naturally falls through to the "not found" state below.
      const [empData, attData, leaveData] = await Promise.all([
        api.employees.get(id),
        api.attendance.list({ employeeId: id, pageSize: 100 }),
        api.leaves.list({ employeeId: id, pageSize: 100 }),
      ]);

      setEmployee(empData);
      setAttendances(attData.data);
      setLeaves(leaveData.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
      setEmployee(null);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-secondary/60 animate-pulse">Loading profile...</div>;
  if (!employee) {
    return (
      <div className="p-8 text-center bg-surface border border-borderBase rounded-xl mt-8">
        <User size={48} className="mx-auto text-secondary/20 mb-4" />
        <h2 className="text-xl font-bold text-secondary mb-2">Employee Not Found</h2>
        <Link to="/employees" className="text-primary hover:underline text-sm font-medium">Return to Directory</Link>
      </div>
    );
  }

  const sortedAttendances = [...attendances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedLeaves = [...leaves].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Determine current real-time status
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysAtt = sortedAttendances.find(a => a.date.startsWith(todayStr));
  const todaysLeave = sortedLeaves.find(l => l.startDate.startsWith(todayStr) && l.status === 'APPROVED');
  
  let currentStatus = "Absent";
  let statusColor = "text-secondary/40";
  let statusBg = "bg-surfaceHover border-borderBase";

  if (todaysLeave) {
    currentStatus = "On Leave Today";
    statusColor = "text-emerald-400";
    statusBg = "bg-emerald-400/10 border-emerald-400/20";
  } else if (todaysAtt) {
    if (todaysAtt.checkOut) {
      currentStatus = "Checked Out";
      statusColor = "text-secondary/60";
      statusBg = "bg-white/10 border-white/10";
    } else if (todaysAtt.status === 'ON_BREAK') {
      currentStatus = "On Break";
      statusColor = "text-yellow-400";
      statusBg = "bg-yellow-400/10 border-yellow-400/20";
    } else {
      currentStatus = "Active Now";
      statusColor = "text-primary";
      statusBg = "bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(0,166,239,0.15)]";
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link to="/employees" className="inline-flex items-center text-sm font-semibold text-secondary/60 hover:text-primary transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Directory
      </Link>

      {/* Profile Header Card */}
      <div className="bg-surface border border-borderBase rounded-2xl overflow-hidden shadow-saas">
        <div className="bg-background/50 border-b border-borderBase p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-surface border-2 border-borderBase flex items-center justify-center text-secondary font-bold text-4xl shadow-inner shrink-0">
            {employee.name.charAt(0)}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-secondary">{employee.name}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-medium text-secondary/60">
              <span className="flex items-center"><Mail size={16} className="mr-1.5 opacity-70" /> {employee.email}</span>
              <span className="flex items-center"><Briefcase size={16} className="mr-1.5 opacity-70" /> {employee.role || 'Staff'}</span>
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-center md:items-end gap-3">
            <div className={`px-4 py-1.5 rounded-lg border text-sm font-bold uppercase tracking-wider ${statusBg} ${statusColor}`}>
              {currentStatus}
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${employee.teamsUserId ? 'bg-primary/10 text-primary' : 'bg-surfaceHover text-secondary/40'}`}>
              {employee.teamsUserId ? 'Teams Connected' : 'No Teams Link'}
            </span>
          </div>
        </div>
        
        {/* Key Metrics Strip */}
        <div className="grid grid-cols-3 divide-x divide-borderBase bg-surface">
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-secondary">{attendances.length}</div>
            <div className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mt-1">Total Shifts</div>
          </div>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-secondary">{leaves.filter(l => l.status === 'APPROVED').length}</div>
            <div className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mt-1">Approved Leaves</div>
          </div>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-secondary">{attendances.filter(a => a.status === 'LATE').length || 0}</div>
            <div className="text-xs font-semibold text-secondary/50 uppercase tracking-wider mt-1">Late Arrivals</div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Log */}
        <div className="bg-surface border border-borderBase rounded-xl shadow-saas flex flex-col">
          <div className="p-5 border-b border-borderBase flex items-center justify-between bg-background/30">
            <h2 className="text-base font-semibold text-secondary flex items-center">
              <Activity size={18} className="mr-2 text-primary" /> Attendance Log
            </h2>
          </div>
          <div className="p-5 flex-1 overflow-y-auto max-h-[400px]">
            {sortedAttendances.length === 0 ? (
              <div className="text-center py-8 text-secondary/40 text-sm font-medium">No attendance records found.</div>
            ) : (
              <div className="space-y-3">
                {sortedAttendances.map(att => (
                  <div key={att.id} className="bg-background rounded-lg border border-borderBase hover:border-borderBase/80 transition-colors overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedAttendanceId(expandedAttendanceId === att.id ? null : att.id)}
                      className="w-full flex justify-between items-center p-4 text-left"
                    >
                      <div>
                        <div className="text-sm font-bold text-secondary mb-1">{new Date(att.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className="text-xs font-medium text-secondary/50">
                          In: {new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {att.checkOut && ` • Out: ${new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          {att.dailyTasks && att.dailyTasks.length > 0 && ` • ${att.dailyTasks.length} task${att.dailyTasks.length === 1 ? '' : 's'}`}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surfaceHover text-secondary/70 border border-borderBase shrink-0">
                        {att.status.replace('_', ' ')}
                      </span>
                    </button>
                    {expandedAttendanceId === att.id && (
                      <div className="border-t border-borderBase">
                        <DailyTasksPanel tasks={att.dailyTasks} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leave History */}
        <div className="bg-surface border border-borderBase rounded-xl shadow-saas flex flex-col">
          <div className="p-5 border-b border-borderBase flex items-center justify-between bg-background/30">
            <h2 className="text-base font-semibold text-secondary flex items-center">
              <CalendarOff size={18} className="mr-2 text-emerald-400" /> Leave History
            </h2>
          </div>
          <div className="p-5 flex-1 overflow-y-auto max-h-[400px]">
            {sortedLeaves.length === 0 ? (
              <div className="text-center py-8 text-secondary/40 text-sm font-medium">No leave requests found.</div>
            ) : (
              <div className="space-y-3">
                {sortedLeaves.map(leave => (
                  <div key={leave.id} className="p-4 bg-background rounded-lg border border-borderBase hover:border-borderBase/80 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-bold text-secondary">
                        {leave.leaveType} · {new Date(leave.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(leave.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5
                        ${leave.status === 'APPROVED' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 
                          leave.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-surfaceHover text-secondary/60 border-borderBase'}`}>
                        {leave.status === 'APPROVED' ? <CheckCircle2 size={12}/> : leave.status === 'REJECTED' ? <XCircle size={12}/> : null}
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-sm text-secondary/70 font-medium leading-relaxed bg-surface p-3 rounded border border-borderBase/50">{leave.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

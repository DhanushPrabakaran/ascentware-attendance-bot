import React, { useEffect, useState } from 'react';
import { Users, Clock, Activity, Coffee, LogOut, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Employee { id: string; name: string; email: string; }
interface AttendanceRecord { id: string; checkIn: string; checkOut: string | null; status: string; employee: Employee; date: string; }
interface Leave { id: string; date: string; status: string; employee: Employee; }

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/admin/employees').then(res => res.json()),
      fetch('/api/v1/admin/attendances').then(res => res.json()),
      fetch('/api/v1/admin/leaves').then(res => res.json())
    ]).then(([emps, atts, lvs]) => {
      setEmployees(emps);
      const today = new Date().toISOString().split('T')[0];
      setAttendances((atts as any[]).filter(a => a.date.startsWith(today)));
      setLeaves((lvs as any[]).filter(l => l.date.startsWith(today) && l.status === 'APPROVED'));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-secondary/60 animate-pulse">Loading operations...</div>;

  const online = attendances.filter(a => !a.checkOut && a.status !== 'ON_BREAK');
  const onBreak = attendances.filter(a => !a.checkOut && a.status === 'ON_BREAK');
  const checkedOut = attendances.filter(a => a.checkOut);
  
  // Calculate absent: Employees not in attendance and not on leave
  const activeIds = new Set([...attendances.map(a => a.employee.id), ...leaves.map(l => l.employee.id)]);
  const absent = employees.filter(e => !activeIds.has(e.id));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-secondary tracking-tight">Command Center</h2>
        <p className="mt-2 text-sm text-secondary/60 font-medium">Real-time pulse of your workforce.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Now" value={online.length} icon={<Activity size={24} />} color="text-primary" />
        <StatCard title="On Break" value={onBreak.length} icon={<Coffee size={24} />} color="text-yellow-400" />
        <StatCard title="On Leave Today" value={leaves.length} icon={<CheckCircle2 size={24} />} color="text-emerald-400" />
        <StatCard title="Absent / Not In" value={absent.length} icon={<LogOut size={24} />} color="text-secondary/40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-borderBase rounded-xl overflow-hidden shadow-xl shadow-background/50">
          <div className="p-6 border-b border-borderBase flex justify-between items-center bg-background/50">
            <h3 className="text-lg font-semibold text-secondary flex items-center"><Clock size={18} className="mr-2 text-primary"/> Live Roster</h3>
            <span className="text-xs font-medium text-secondary/50 bg-white/5 px-3 py-1 rounded-full">{employees.length} Total</span>
          </div>
          <ul className="divide-y divide-borderBase max-h-[600px] overflow-y-auto">
            {employees.map(emp => {
              const att = attendances.find(a => a.employee.id === emp.id);
              const lv = leaves.find(l => l.employee.id === emp.id);
              
              let statusText = "Absent";
              let badgeStyle = "bg-surfaceHover text-secondary/40 border border-borderBase";
              
              if (lv) {
                statusText = "On Leave";
                badgeStyle = "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20";
              } else if (att) {
                if (att.checkOut) {
                  statusText = "Checked Out";
                  badgeStyle = "bg-white/10 text-secondary/60 border border-white/10";
                } else if (att.status === 'ON_BREAK') {
                  statusText = "On Break";
                  badgeStyle = "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20";
                } else {
                  statusText = "Active";
                  badgeStyle = "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(43,179,228,0.2)]";
                }
              }

              return (
                <li key={emp.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-background border border-borderBase flex items-center justify-center text-secondary/80 font-bold shadow-inner group-hover:border-primary/30 transition-colors">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <Link to={`/employees/${emp.id}`} className="text-sm font-semibold text-secondary hover:text-primary transition-colors">{emp.name}</Link>
                      <p className="text-xs text-secondary/50 font-medium">{emp.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                      {statusText}
                    </span>
                    {att && <p className="text-[11px] text-secondary/40 mt-1.5 font-medium">In: {new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        
        <div className="space-y-6">
          <div className="bg-surface border border-borderBase rounded-xl p-6 shadow-xl shadow-background/50">
            <h3 className="text-lg font-semibold text-secondary mb-4">Quick Insights</h3>
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border border-borderBase">
                <div className="text-sm font-medium text-secondary/60 mb-1">Attendance Rate</div>
                <div className="text-2xl font-bold text-secondary">
                  {employees.length ? Math.round(((online.length + onBreak.length + checkedOut.length) / employees.length) * 100) : 0}%
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg border border-borderBase">
                <div className="text-sm font-medium text-secondary/60 mb-1">Active Now</div>
                <div className="text-2xl font-bold text-primary">{online.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-surface border border-borderBase p-6 rounded-xl relative overflow-hidden group hover:border-borderBase/80 transition-all shadow-xl shadow-background/50">
      <div className={`absolute top-0 right-0 -mt-2 -mr-2 p-6 rounded-bl-3xl bg-white/5 transition-colors ${color}`}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-secondary/50 tracking-wide uppercase">{title}</p>
      <p className="text-4xl font-bold text-secondary mt-3 tracking-tight relative z-10">{value}</p>
    </div>
  );
}

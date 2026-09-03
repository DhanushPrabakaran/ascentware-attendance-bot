import { useEffect, useState } from 'react';
import { Users, Clock, Activity, Coffee, LogOut, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AttendanceRecord {
  id: string;
  checkIn: string;
  checkOut: string | null;
  status: string;
  employee: { name: string; email: string };
  breakStart?: string;
  breakEnd?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({ employees: 0, shifts: 0 });
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/admin/employees').then(res => res.json()),
      fetch('/api/v1/admin/shifts').then(res => res.json()),
      fetch('/api/v1/admin/attendances').then(res => res.json())
    ]).then(([emps, shfs, atts]) => {
      setStats({ employees: emps.length, shifts: shfs.length });
      const today = new Date().toISOString().split('T')[0];
      const todayAtts = (atts as any[]).filter(a => a.date.startsWith(today));
      setAttendances(todayAtts);
    });
  }, []);

  const online = attendances.filter(a => !a.checkOut && a.status !== 'ON_BREAK').length;
  const onBreak = attendances.filter(a => !a.checkOut && a.status === 'ON_BREAK').length;
  const checkedOut = attendances.filter(a => a.checkOut).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Live Operations</h2>
        <p className="mt-2 text-sm text-white/60 font-medium">Real-time attendance and workforce status.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Now" value={online} icon={<Activity size={24} />} color="text-primary" />
        <StatCard title="On Break" value={onBreak} icon={<Coffee size={24} />} color="text-yellow-400" />
        <StatCard title="Checked Out" value={checkedOut} icon={<LogOut size={24} />} color="text-white/50" />
        <StatCard title="Total Employees" value={stats.employees} icon={<Users size={24} />} color="text-white" />
      </div>

      <div className="bg-surface border border-borderBase rounded-xl overflow-hidden">
        <div className="p-6 border-b border-borderBase flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <Link to="/attendance" className="text-sm font-semibold text-primary hover:text-primaryHover transition-colors">
            View full log &rarr;
          </Link>
        </div>
        <ul className="divide-y divide-borderBase">
          {attendances.length > 0 ? (
            attendances.slice(0, 5).map((a) => (
              <li key={a.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded bg-tertiary flex items-center justify-center text-primary font-bold">
                    {a.employee.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{a.employee.name}</p>
                    <p className="text-xs text-white/50 font-medium">{a.employee.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider
                    ${a.checkOut ? 'bg-white/10 text-white/50 border border-white/10' : 
                      a.status === 'ON_BREAK' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' : 
                      'bg-primary/10 text-primary border border-primary/20'}`}>
                    {a.checkOut ? 'Left' : a.status === 'ON_BREAK' ? 'Break' : 'Active'}
                  </span>
                  <p className="text-xs text-white/40 mt-1">In: {new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </li>
            ))
          ) : (
            <li className="p-8 text-center text-white/40 text-sm font-medium">No activity today yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-surface border border-borderBase p-6 rounded-xl relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className={`absolute top-0 right-0 -mt-4 -mr-4 p-8 rounded-full bg-white/5 group-hover:bg-primary/10 transition-colors ${color}`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-white/60 relative z-10">{title}</p>
      <p className="text-4xl font-bold text-white mt-2 tracking-tight relative z-10">{value}</p>
    </div>
  );
}

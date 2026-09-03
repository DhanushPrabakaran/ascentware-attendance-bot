import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Filter, Search } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: string;
  workingMinutes: number;
  employeeId: string;
  employee: { id: string; name: string; email: string };
}

export default function Attendance() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  const fetchAttendances = async () => {
    const res = await fetch('/api/v1/admin/attendances');
    setAttendances(await res.json());
  };

  useEffect(() => {
    fetchAttendances();
  }, []);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-secondary tracking-tight">Attendance Log</h2>
          <p className="mt-2 text-sm text-secondary/60 font-medium">Daily check-in and check-out records.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/40 h-4 w-4" />
            <input type="text" placeholder="Search employee..." 
              className="bg-surface border border-borderBase rounded-lg pl-9 pr-4 py-2 text-sm text-secondary placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors" />
          </div>
          <button className="bg-surface border border-borderBase p-2 rounded-lg text-secondary/70 hover:text-secondary hover:bg-surfaceHover transition-colors">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-surface border border-borderBase rounded-xl overflow-hidden shadow-xl shadow-background/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-borderBase bg-surfaceHover/30">
                <th className="py-4 px-6 text-xs font-semibold text-secondary/60 uppercase tracking-wider">Employee</th>
                <th className="py-4 px-6 text-xs font-semibold text-secondary/60 uppercase tracking-wider">Date</th>
                <th className="py-4 px-6 text-xs font-semibold text-secondary/60 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-secondary/60 uppercase tracking-wider">Check In</th>
                <th className="py-4 px-6 text-xs font-semibold text-secondary/60 uppercase tracking-wider">Check Out</th>
                <th className="py-4 px-6 text-xs font-semibold text-secondary/60 uppercase tracking-wider text-right">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase">
              {attendances.map((a) => (
                <tr key={a.id} className="hover:bg-surfaceHover/50 transition-colors">
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded bg-surfaceHover text-primary flex items-center justify-center font-bold text-sm mr-3">
                        {a.employee.name.charAt(0)}
                      </div>
                      <div>
                        <Link to={`/employees/${a.employee.id || a.employeeId}`} className="text-sm font-semibold text-primary hover:underline">{a.employee.name}</Link>
                        <div className="text-xs text-secondary/50 mt-0.5">{a.employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center text-sm text-secondary/80">
                      <CalendarIcon className="w-4 h-4 mr-2 text-secondary/40" />
                      {new Date(a.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider
                      ${a.status === 'LATE' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                        a.checkOut ? 'bg-white/10 text-secondary/50 border border-white/10' : 
                        a.status === 'ON_BREAK' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' : 
                        'bg-primary/10 text-primary border border-primary/20'}`}>
                      {a.status === 'LATE' ? 'Late' : a.checkOut ? 'Left' : a.status === 'ON_BREAK' ? 'Break' : 'Active'}
                    </span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-sm text-secondary/80 font-medium">
                    {formatTime(a.checkIn)}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-sm text-secondary/80 font-medium">
                    {formatTime(a.checkOut)}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-sm text-secondary text-right font-semibold">
                    {a.workingMinutes > 0 ? (a.workingMinutes / 60).toFixed(1) + 'h' : '--'}
                  </td>
                </tr>
              ))}
              {attendances.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary/40 text-sm font-medium">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

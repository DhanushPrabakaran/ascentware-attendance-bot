import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Filter, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { Attendance as AttendanceRecord } from '../lib/types';
import { DataList, type DataListColumn } from '../components/ui/DataList';
import { Pagination } from '../components/ui/Pagination';

const PAGE_SIZE = 25;

export default function Attendance() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchAttendances = async () => {
    const result = await api.attendance.list({ page, pageSize: PAGE_SIZE });
    setAttendances(result.data);
    setTotal(result.total);
  };

  useEffect(() => {
    fetchAttendances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const columns: DataListColumn<AttendanceRecord>[] = [
    {
      header: 'Employee',
      render: (a) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded bg-surfaceHover text-primary flex items-center justify-center font-bold text-sm mr-3 shrink-0">
            {a.employee?.name.charAt(0)}
          </div>
          <div>
            <Link to={`/employees/${a.employeeId}`} className="text-sm font-semibold text-primary hover:underline">{a.employee?.name}</Link>
            <div className="text-xs text-secondary/50 mt-0.5">{a.employee?.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Date',
      render: (a) => (
        <div className="flex items-center text-sm text-secondary/80">
          <CalendarIcon className="w-4 h-4 mr-2 text-secondary/40" />
          {new Date(a.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (a) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider
          ${a.status === 'LATE' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
            a.checkOut ? 'bg-white/10 text-secondary/50 border border-white/10' :
            a.status === 'ON_BREAK' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' :
            'bg-primary/10 text-primary border border-primary/20'}`}>
          {a.status === 'LATE' ? 'Late' : a.checkOut ? 'Left' : a.status === 'ON_BREAK' ? 'Break' : 'Active'}
        </span>
      ),
    },
    { header: 'Check In', render: (a) => formatTime(a.checkIn) },
    { header: 'Check Out', render: (a) => formatTime(a.checkOut) },
    {
      header: 'Hours',
      render: (a) => (a.workingMinutes > 0 ? (a.workingMinutes / 60).toFixed(1) + 'h' : '--'),
    },
  ];

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

      <DataList
        columns={columns}
        rows={attendances}
        rowKey={(a) => a.id}
        emptyMessage="No attendance records found."
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}

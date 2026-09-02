import { useEffect, useState } from 'react';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: string;
  workingMinutes: number;
  employee: { name: string; email: string };
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
    if (!isoString) return 'Active';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Attendance Log</h2>
        <p className="mt-1 text-sm text-gray-500">View daily check-in and check-out logs for all employees.</p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {attendances.map((a) => (
            <li key={a.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {a.employee.name} <span className="text-gray-500 font-normal text-xs ml-1">({a.employee.email})</span>
                  </h3>
                  <div className="mt-2 text-sm text-gray-700 flex space-x-4">
                    <div>
                      <span className="font-semibold">In:</span> {formatTime(a.checkIn)}
                    </div>
                    <div>
                      <span className="font-semibold">Out:</span> {formatTime(a.checkOut)}
                    </div>
                    {a.checkOut && (
                      <div className="text-gray-500">
                        <span className="font-semibold">Hours:</span> {(a.workingMinutes / 60).toFixed(1)}h
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 sm:text-right">
                  <p className="text-xs font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full border inline-block 
                    ${a.status === 'LATE' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                      a.checkOut ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}">
                    {a.status === 'LATE' ? 'Late Check-in' : a.checkOut ? 'Checked Out' : 'Working'}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    {new Date(a.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
          {attendances.length === 0 && (
            <li className="p-12 text-center text-gray-500 text-sm">No attendance records found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

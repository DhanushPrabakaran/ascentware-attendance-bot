import { useEffect, useState } from 'react';

interface Leave {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  employee: { name: string; email: string };
  createdAt: string;
}

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);

  const fetchLeaves = async () => {
    const res = await fetch('/api/v1/admin/leaves');
    setLeaves(await res.json());
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Leave Requests</h2>
        <p className="mt-1 text-sm text-gray-500">View all submitted leave applications.</p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {leaves.map((l) => (
            <li key={l.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{l.employee.name} <span className="text-gray-500 font-normal text-xs ml-1">({l.employee.email})</span></h3>
                  <p className="text-gray-700 mt-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200 italic shadow-inner">
                    "{l.reason}"
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:text-right">
                  <p className="text-xs font-semibold text-primary tracking-wider uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 inline-block">
                    {new Date(l.startDate).toLocaleDateString()} &rarr; {new Date(l.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    Applied: {new Date(l.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
          {leaves.length === 0 && (
            <li className="p-12 text-center text-gray-500 text-sm">No leaves have been requested yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

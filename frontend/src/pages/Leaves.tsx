import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Leave {
  id: string;
  date: string;
  reason: string;
  status: string;
  employeeId: string;
  employee: { id: string; name: string; email: string };
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
        <h2 className="text-3xl font-bold text-secondary tracking-tight">Leave Requests</h2>
        <p className="mt-2 text-sm text-secondary/60 font-medium">View all submitted leave applications.</p>
      </div>

      <div className="bg-surface border border-borderBase rounded-xl overflow-hidden shadow-xl shadow-background/50">
        <ul className="divide-y divide-borderBase">
          {leaves.map((l) => (
            <li key={l.id} className="p-6 hover:bg-surfaceHover/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="flex items-start flex-1">
                  <div className="w-10 h-10 rounded bg-surfaceHover text-primary flex items-center justify-center font-bold text-sm mr-4 mt-1">
                    {l.employee.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1">
                      <Link to={`/employees/${l.employee.id || l.employeeId}`} className="text-sm font-semibold text-primary hover:underline">{l.employee.name}</Link>
                      <span className="text-secondary/50 font-normal text-xs ml-2">({l.employee.email})</span>
                    </div>
                    <p className="text-secondary/80 mt-2 text-sm bg-background p-4 rounded-lg border border-borderBase shadow-inner whitespace-pre-wrap">
                      {l.reason}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right shrink-0">
                  <p className={`text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full border inline-block
                    ${l.status === 'APPROVED' ? 'bg-primary/10 text-primary border-primary/20' : 
                      l.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                      'bg-surfaceHover text-secondary/80 border-borderBase'}`}>
                    {l.status}
                  </p>
                  <p className="text-xs text-secondary/40 mt-3 font-medium flex items-center justify-end">
                    <span className="mr-1">Applied:</span> {new Date(l.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
          {leaves.length === 0 && (
            <li className="p-12 text-center text-secondary/40 text-sm font-medium">No leaves have been requested yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

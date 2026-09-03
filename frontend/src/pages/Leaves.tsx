import { useEffect, useState } from 'react';

interface Leave {
  id: string;
  date: string;
  reason: string;
  status: string;
  employee: { name: string; email: string };
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
        <h2 className="text-3xl font-bold text-white tracking-tight">Leave Requests</h2>
        <p className="mt-2 text-sm text-white/60 font-medium">View all submitted leave applications.</p>
      </div>

      <div className="bg-surface border border-borderBase rounded-xl overflow-hidden shadow-2xl shadow-black/20">
        <ul className="divide-y divide-borderBase">
          {leaves.map((l) => (
            <li key={l.id} className="p-6 hover:bg-white/5 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">{l.employee.name} <span className="text-white/50 font-normal text-xs ml-1">({l.employee.email})</span></h3>
                  <p className="text-white/80 mt-3 text-sm bg-tertiary p-4 rounded-lg border border-borderBase shadow-inner whitespace-pre-wrap">
                    {l.reason}
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:text-right">
                  <p className={`text-xs font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full border inline-block
                    ${l.status === 'APPROVED' ? 'bg-primary/10 text-primary border-primary/20' : 
                      l.status === 'REJECTED' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                      'bg-white/10 text-white border-white/20'}`}>
                    {l.status}
                  </p>
                  <p className="text-xs text-white/40 mt-3 font-medium">
                    Applied: {new Date(l.date).toLocaleString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
          {leaves.length === 0 && (
            <li className="p-12 text-center text-white/40 text-sm font-medium">No leaves have been requested yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

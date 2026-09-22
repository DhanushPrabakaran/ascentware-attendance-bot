import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Employee } from '../lib/types';
import { EmployeeRosterList } from '../components/EmployeeRosterList';

export default function Team() {
  const [reports, setReports] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.employees.myReports().then((data) => {
      setReports(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-secondary/60 animate-pulse">Loading your team...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-secondary tracking-tight">My Team</h2>
        <p className="mt-2 text-sm text-secondary/60 font-medium">
          Everyone who reports to you, directly or indirectly. Click a name for their full
          attendance and leave history.
        </p>
      </div>

      <EmployeeRosterList
        employees={reports}
        emptyMessage="You don't have any direct or indirect reports yet."
      />
    </div>
  );
}

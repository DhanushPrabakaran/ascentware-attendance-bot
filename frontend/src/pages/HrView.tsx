import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Employee } from '../lib/types';
import { EmployeeRosterList } from '../components/EmployeeRosterList';

export default function HrView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.employees.hrAssigned().then((data) => {
      setEmployees(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-secondary/60 animate-pulse">Loading your assigned employees...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-secondary tracking-tight">HR View</h2>
        <p className="mt-2 text-sm text-secondary/60 font-medium">
          Employees assigned to you as their HR business partner. This is read-only visibility -
          leave approval/rejection stays with the employee's manager.
        </p>
      </div>

      <EmployeeRosterList
        employees={employees}
        emptyMessage="No employees are currently assigned to you."
      />
    </div>
  );
}

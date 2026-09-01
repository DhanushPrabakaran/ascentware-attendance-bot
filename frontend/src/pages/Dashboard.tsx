import { useEffect, useState } from 'react';
import { Users, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ employees: 0, shifts: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/admin/employees').then(res => res.json()),
      fetch('/api/v1/admin/shifts').then(res => res.json())
    ]).then(([emps, shfs]) => {
      setStats({ employees: emps.length, shifts: shfs.length });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <p className="mt-1 text-sm text-gray-500">Welcome back to Ascentware Admin.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-50 p-3 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Employees</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900">{stats.employees}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <div className="text-sm">
              <a href="/employees" className="font-medium text-primary hover:text-primaryHover">
                View all
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-50 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Shifts</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900">{stats.shifts}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <div className="text-sm">
              <a href="/shifts" className="font-medium text-primary hover:text-primaryHover">
                View all
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

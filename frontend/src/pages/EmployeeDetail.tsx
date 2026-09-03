import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, CalendarOff, CheckCircle2, XCircle } from 'lucide-react';

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // We assume /api/employees gives us all employees, we find by ID
      const empRes = await fetch('/api/employees');
      const empData = await empRes.json();
      const currentEmp = empData.find((e: any) => e.id === id);
      setEmployee(currentEmp);

      const [attRes, leaveRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/leaves')
      ]);
      const attData = await attRes.json();
      const leaveData = await leaveRes.json();

      setAttendances(attData.filter((a: any) => a.employee?.id === id || a.employeeId === id));
      setLeaves(leaveData.filter((l: any) => l.employee?.id === id || l.employeeId === id));
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-secondary/60">Loading employee details...</div>;
  }

  if (!employee) {
    return (
      <div className="p-8">
        <Link to="/employees" className="text-primary hover:underline flex items-center mb-6">
          <ArrowLeft size={16} className="mr-2" /> Back to Employees
        </Link>
        <div className="text-secondary/60">Employee not found.</div>
      </div>
    );
  }

  const sortedAttendances = [...attendances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedLeaves = [...leaves].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/employees" className="text-tertiary hover:text-secondary transition-colors flex items-center text-sm font-medium mb-4">
          <ArrowLeft size={16} className="mr-1" /> Back
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-secondary">{employee.name}</h1>
        <p className="text-tertiary mt-1">{employee.email}</p>
        <div className="mt-4 flex gap-3">
          <span className="px-3 py-1 bg-surface border border-borderBase rounded-full text-xs font-semibold text-secondary">
            Role: {employee.role}
          </span>
          <span className="px-3 py-1 bg-surface border border-borderBase rounded-full text-xs font-semibold text-secondary">
            Teams: {employee.teamsUserId ? 'Linked' : 'Not Linked'}
          </span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Stats */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-borderBase rounded-xl p-6 shadow-xl shadow-background/50">
            <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center">
              <Clock size={18} className="mr-2 text-primary" /> Recent Activity
            </h2>
            {sortedAttendances.length === 0 ? (
              <p className="text-tertiary text-sm">No recent attendance records.</p>
            ) : (
              <div className="space-y-4">
                {sortedAttendances.slice(0, 5).map(att => (
                  <div key={att.id} className="flex justify-between items-center p-3 bg-background rounded-lg border border-borderBase">
                    <div>
                      <div className="text-sm font-medium text-secondary">{new Date(att.date).toLocaleDateString()}</div>
                      <div className="text-xs text-tertiary mt-1">
                        In: {new Date(att.checkIn).toLocaleTimeString()} 
                        {att.checkOut && ` - Out: ${new Date(att.checkOut).toLocaleTimeString()}`}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surfaceHover text-primary border border-primary/20">
                      {att.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-surface border border-borderBase rounded-xl p-6 shadow-xl shadow-background/50">
            <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center">
              <CalendarOff size={18} className="mr-2 text-primary" /> Leaves
            </h2>
            {sortedLeaves.length === 0 ? (
              <p className="text-tertiary text-sm">No leave requests found.</p>
            ) : (
              <div className="space-y-3">
                {sortedLeaves.slice(0, 4).map(leave => (
                  <div key={leave.id} className="p-3 bg-background rounded-lg border border-borderBase">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-secondary">{new Date(leave.date).toLocaleDateString()}</span>
                      {leave.status === 'APPROVED' ? <CheckCircle2 size={16} className="text-primary" /> : 
                       leave.status === 'REJECTED' ? <XCircle size={16} className="text-tertiary" /> :
                       <span className="text-xs text-tertiary font-medium">{leave.status}</span>}
                    </div>
                    <p className="text-xs text-tertiary line-clamp-2">{leave.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

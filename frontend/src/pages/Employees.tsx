import { useEffect, useState } from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  teamsUserId?: string;
  shiftId?: string;
  managerEmails: string[];
}

interface Shift {
  id: string;
  name: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    email: '',
    managerEmails: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/v1/admin/employees');
      if (!res.ok) throw new Error('Failed to load employees');
      setEmployees(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/v1/admin/shifts');
      if (!res.ok) throw new Error('Failed to load shifts');
      setShifts(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchShifts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditing && formData.id) {
        const res = await fetch(`/api/v1/admin/employees/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Failed to update employee');
      } else {
        const res = await fetch('/api/v1/admin/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Failed to create employee');
      }
      setIsModalOpen(false);
      await fetchEmployees();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      const res = await fetch(`/api/v1/admin/employees/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete employee');
      await fetchEmployees();
    } catch (err: any) {
      setError(err.message);
      alert(err.message);
    }
  };

  const openAddModal = () => {
    setFormData({name: '', email: '', managerEmails: []});
    setIsEditing(false);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setFormData(emp);
    setIsEditing(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleManagerToggle = (email: string) => {
    const current = formData.managerEmails || [];
    if (current.includes(email)) {
      setFormData({ ...formData, managerEmails: current.filter(e => e !== email) });
    } else {
      setFormData({ ...formData, managerEmails: [...current, email] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Employees</h2>
          <p className="mt-2 text-sm text-white/60 font-medium">Manage your workforce and assign managers.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primaryHover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Add Employee
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      <div className="bg-surface border border-borderBase rounded-xl overflow-hidden shadow-2xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-borderBase">
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Managers</th>
                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-white">{emp.name}</div>
                    <div className="text-sm text-white/50">{emp.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {emp.teamsUserId ? (
                      <span className="px-2.5 py-0.5 inline-flex text-xs font-semibold uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20">Linked to Teams</span>
                    ) : (
                      <span className="px-2.5 py-0.5 inline-flex text-xs font-semibold uppercase tracking-wider rounded-full bg-white/10 text-white/50 border border-white/20">Not Linked</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80 font-medium">
                    {emp.managerEmails?.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEditModal(emp)} className="text-primary hover:text-primaryHover mr-4 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(emp.id)} className="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/40 text-sm font-medium">No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-tertiary rounded-xl shadow-2xl border border-borderBase w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-borderBase">
              <h3 className="text-xl font-bold text-white tracking-tight">{isEditing ? 'Edit Employee' : 'Add Employee'}</h3>
            </div>
            <div className="p-6">
              {error && (
                <div className="mb-4 bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-medium">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-1">Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="block w-full px-3 py-2 bg-neutral border border-borderBase rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-1">Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="block w-full px-3 py-2 bg-neutral border border-borderBase rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Select Managers</label>
                  <div className="space-y-2 bg-neutral border border-borderBase rounded-lg p-3 max-h-48 overflow-y-auto">
                    {employees.filter(e => e.id !== formData.id).map(emp => (
                      <label key={emp.email} className="flex items-center space-x-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.managerEmails?.includes(emp.email)}
                          onChange={() => handleManagerToggle(emp.email)}
                          className="w-4 h-4 rounded border-borderBase bg-tertiary text-primary focus:ring-primary focus:ring-offset-neutral"
                        />
                        <span className="text-sm font-medium text-white">{emp.name} <span className="text-white/40">({emp.email})</span></span>
                      </label>
                    ))}
                    {employees.length <= (isEditing ? 1 : 0) && <span className="text-sm text-white/40 italic">No other employees available.</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-1">Shift</label>
                  <select value={formData.shiftId || ''} onChange={e => setFormData({...formData, shiftId: e.target.value})} className="block w-full px-3 py-2 bg-neutral border border-borderBase rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors">
                    <option value="">No Shift</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-borderBase">
                  <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 border border-borderBase text-sm font-medium rounded-lg text-white/80 bg-surface hover:bg-white/5 hover:text-white disabled:opacity-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary hover:bg-primaryHover disabled:opacity-50 flex items-center transition-colors">
                    {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Employee')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

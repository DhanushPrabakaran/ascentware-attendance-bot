import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { api, ApiError, type EmployeeInput } from '../lib/api';
import type { Employee, Shift } from '../lib/types';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataList, type DataListColumn } from '../components/ui/DataList';

type FormState = Partial<EmployeeInput> & { id?: string };

const emptyForm: FormState = { name: '', email: '', managerEmails: [], hrEmail: '' };

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      setEmployees(await api.employees.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load employees');
    }
  };

  const fetchShifts = async () => {
    try {
      setShifts(await api.shifts.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load shifts');
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
      const payload: EmployeeInput = {
        name: formData.name || '',
        email: formData.email || '',
        managerEmails: formData.managerEmails || [],
        hrEmail: formData.hrEmail || null,
        shiftId: formData.shiftId || null,
      };
      if (formData.password) payload.password = formData.password;

      if (isEditing && formData.id) {
        await api.employees.update(formData.id, payload);
      } else {
        await api.employees.create(payload);
      }
      setIsModalOpen(false);
      await fetchEmployees();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Failed to ${isEditing ? 'update' : 'create'} employee`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this employee? Their attendance/leave history is kept.'))
      return;
    try {
      await api.employees.deactivate(id);
      await fetchEmployees();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to deactivate employee';
      setError(message);
      alert(message);
    }
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setFormData({ ...emp, password: '' });
    setIsEditing(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleManagerToggle = (email: string) => {
    const current = formData.managerEmails || [];
    setFormData({
      ...formData,
      managerEmails: current.includes(email)
        ? current.filter((e) => e !== email)
        : [...current, email],
    });
  };

  const columns: DataListColumn<Employee>[] = [
    {
      header: 'Name',
      render: (emp) => (
        <div>
          <Link
            to={`/employees/${emp.id}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {emp.name}
          </Link>
          <div className="text-sm text-secondary/50">{emp.email}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (emp) =>
        emp.teamsUserId ? (
          <Badge variant="success">Linked to Teams</Badge>
        ) : (
          <Badge variant="neutral">Not Linked</Badge>
        ),
    },
    {
      header: 'Managers',
      render: (emp) => emp.managerEmails?.length || 0,
    },
    {
      header: 'HR',
      render: (emp) => emp.hrEmail || <span className="text-secondary/30">—</span>,
    },
    {
      header: 'Actions',
      className: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium',
      render: (emp) => (
        <span className="inline-flex gap-4">
          <button
            onClick={() => openEditModal(emp)}
            className="text-primary hover:text-primaryHover transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeactivate(emp.id)}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-secondary tracking-tight">Employees</h2>
          <p className="mt-2 text-sm text-secondary/60 font-medium">
            Manage your workforce, managers, and HR assignments.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={16} />
          Add Employee
        </Button>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      <DataList
        columns={columns}
        rows={employees}
        rowKey={(emp) => emp.id}
        emptyMessage="No employees found."
      />

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Employee' : 'Add Employee'}
      >
        {error && (
          <div className="mb-4 bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-medium">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">
              Name
            </label>
            <input
              required
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">
              Email
            </label>
            <input
              required
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">
              {isEditing ? 'Reset Password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              required={!isEditing}
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEditing ? '••••••••' : 'Set an initial password'}
              className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">
              HR Business Partner
            </label>
            <select
              value={formData.hrEmail || ''}
              onChange={(e) => setFormData({ ...formData, hrEmail: e.target.value })}
              className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
            >
              <option value="">No HR assigned</option>
              {employees
                .filter((e) => e.role === 'HR')
                .map((hr) => (
                  <option key={hr.email} value={hr.email}>
                    {hr.name} ({hr.email})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-2">
              Select Managers
            </label>
            <div className="space-y-2 bg-background border border-borderBase rounded-lg p-3 max-h-48 overflow-y-auto">
              {employees.map((emp) => (
                <label
                  key={emp.email}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.managerEmails?.includes(emp.email) || false}
                    onChange={() => handleManagerToggle(emp.email)}
                    className="w-4 h-4 rounded border-borderBase bg-surfaceHover text-primary focus:ring-primary focus:ring-offset-neutral"
                  />
                  <span className="text-sm font-medium text-secondary">
                    {emp.name}{' '}
                    <span className="text-secondary/40">({emp.email})</span>
                  </span>
                </label>
              ))}
              {employees.length === 0 && (
                <span className="text-sm text-secondary/40 italic">
                  No employees available.
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary/80 mb-1">
              Shift
            </label>
            <select
              value={formData.shiftId || ''}
              onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
              className="block w-full px-3 py-2 bg-background border border-borderBase rounded-lg text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base sm:text-sm transition-colors"
            >
              <option value="">No Shift</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-borderBase">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

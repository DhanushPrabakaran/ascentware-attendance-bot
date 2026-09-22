import { Link } from 'react-router-dom';
import type { Employee } from '../lib/types';
import { DataList, type DataListColumn } from './ui/DataList';
import { Badge } from './ui/Badge';

const columns: DataListColumn<Employee>[] = [
  {
    header: 'Name',
    render: (emp) => (
      <div>
        <Link to={`/employees/${emp.id}`} className="text-sm font-semibold text-primary hover:underline">
          {emp.name}
        </Link>
        <div className="text-sm text-secondary/50">{emp.email}</div>
      </div>
    ),
  },
  { header: 'Role', render: (emp) => emp.role },
  {
    header: 'Status',
    render: (emp) =>
      emp.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Deactivated</Badge>,
  },
  { header: 'Shift', render: (emp) => emp.shift?.name || <span className="text-secondary/30">—</span> },
];

/**
 * Shared by Team.tsx (a manager's direct+indirect reports) and HrView.tsx (an HR
 * partner's assigned employees) - same read-only roster shape, different data source.
 * Click-through into the existing /employees/:id route for full history.
 */
export function EmployeeRosterList({
  employees,
  emptyMessage,
}: {
  employees: Employee[];
  emptyMessage: string;
}) {
  return (
    <DataList columns={columns} rows={employees} rowKey={(emp) => emp.id} emptyMessage={emptyMessage} />
  );
}

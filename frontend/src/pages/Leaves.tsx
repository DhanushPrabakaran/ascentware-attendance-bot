import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Leave } from '../lib/types';
import { Badge, statusToVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Pagination } from '../components/ui/Pagination';

const PAGE_SIZE = 25;

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchLeaves = async () => {
    try {
      const result = await api.leaves.list({ page, pageSize: PAGE_SIZE });
      setLeaves(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load leaves');
    }
  };

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const decide = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActingOn(id);
    try {
      await api.leaves.updateStatus(id, status);
      await fetchLeaves();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update leave status');
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-secondary tracking-tight">Leave Requests</h2>
        <p className="mt-2 text-sm text-secondary/60 font-medium">
          Review and act on leave applications you're authorized to manage.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      <div className="bg-surface border border-borderBase rounded-xl overflow-hidden shadow-saas">
        <ul className="divide-y divide-borderBase">
          {leaves.map((l) => (
            <li key={l.id} className="p-6 hover:bg-surfaceHover/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="flex items-start flex-1">
                  <div className="w-10 h-10 rounded bg-surfaceHover text-primary flex items-center justify-center font-bold text-sm mr-4 mt-1 shrink-0">
                    {l.employee?.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1">
                      <Link
                        to={`/employees/${l.employeeId}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {l.employee?.name}
                      </Link>
                      <span className="text-secondary/50 font-normal text-xs ml-2">
                        ({l.employee?.email})
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-secondary/60 uppercase tracking-wider">
                      {l.leaveType} · {new Date(l.startDate).toLocaleDateString()} -{' '}
                      {new Date(l.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-secondary/80 mt-2 text-sm bg-background p-4 rounded-lg border border-borderBase shadow-inner whitespace-pre-wrap">
                      {l.reason}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right shrink-0 flex flex-col items-start sm:items-end gap-3">
                  <Badge variant={statusToVariant(l.status)}>{l.status}</Badge>
                  {l.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        className="px-3 py-1.5 text-xs"
                        disabled={actingOn === l.id}
                        onClick={() => decide(l.id, 'APPROVED')}
                      >
                        <Check size={14} /> Approve
                      </Button>
                      <Button
                        variant="danger"
                        className="px-3 py-1.5 text-xs"
                        disabled={actingOn === l.id}
                        onClick={() => decide(l.id, 'REJECTED')}
                      >
                        <X size={14} /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
          {leaves.length === 0 && (
            <li className="p-12 text-center text-secondary/40 text-sm font-medium">
              No leaves have been requested yet.
            </li>
          )}
        </ul>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}

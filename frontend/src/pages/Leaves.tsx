import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Leave, LeaveStatus } from '../lib/types';
import { Badge, statusToVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Pagination } from '../components/ui/Pagination';
import { Avatar, EmptyState, ErrorBanner, Loading, PageHeader, Segmented } from '../components/ui/Page';
import { describeLeave, formatMinutes } from '../lib/format';
import { useAuth } from '../lib/auth';
import { LeavePolicies } from '../components/LeavePolicies';

const PAGE_SIZE = 25;
type Tab = 'PENDING' | 'APPROVED' | 'ALL';

/** Leave requests from everyone you can see; approve or reject the ones you manage. */
export default function Leaves() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [leaves, setLeaves] = useState<Leave[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  // HR sees leave but never decides it; managers decide for their reports, admins for all.
  const canDecide = user?.role === 'ADMIN' || !!user?.isManager;

  const fetchLeaves = useCallback(async () => {
    try {
      const result = await api.leaves.list({
        page,
        pageSize: PAGE_SIZE,
        ...(tab === 'ALL' ? {} : { status: tab as LeaveStatus }),
      });
      setLeaves(result.data);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load leaves');
    }
  }, [page, tab]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

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
      <PageHeader
        title="Leave requests"
        description={canDecide ? 'Approve or reject leave for the people you manage.' : 'Leave requests for the people assigned to you.'}
      />

      <Segmented
        label="Status"
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
        options={[
          { value: 'PENDING', label: 'Pending' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'ALL', label: 'All' },
        ]}
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {!leaves ? (
        !error && <Loading />
      ) : leaves.length === 0 ? (
        <EmptyState title={tab === 'PENDING' ? 'Nothing waiting for a decision' : 'No leave requests'} />
      ) : (
        <ul className="divide-y divide-borderBase overflow-hidden rounded-xl border border-borderBase bg-surface shadow-saas">
          {leaves.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 gap-3">
                {l.employee && <Avatar name={l.employee.name} />}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/employees/${l.employeeId}`} className="text-sm font-semibold text-secondary hover:text-primary">
                      {l.employee?.name}
                    </Link>
                    <Badge variant={statusToVariant(l.status)}>{l.status.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-secondary/80">
                    <span className="font-medium">{l.leaveType}</span> · {describeLeave(l)}
                    {l.durationMinutes ? ` (${formatMinutes(l.durationMinutes)})` : ''}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-tertiary">{l.reason}</p>
                </div>
              </div>
              {canDecide && l.status === 'PENDING' && (
                <div className="flex shrink-0 gap-2 sm:pt-1">
                  <Button className="px-3 py-1.5 text-xs" disabled={actingOn === l.id} onClick={() => decide(l.id, 'APPROVED')}>
                    <Check size={14} /> Approve
                  </Button>
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={actingOn === l.id} onClick={() => decide(l.id, 'REJECTED')}>
                    <X size={14} /> Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {user?.role === 'ADMIN' && <LeavePolicies />}
    </div>
  );
}

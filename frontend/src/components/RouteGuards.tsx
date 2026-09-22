import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { Role } from '../lib/types';

/**
 * Frontend-only UX guards - they just avoid nav dead-ends by redirecting away from a
 * page the user has no menu entry for. Real enforcement is server-side (Phase 6's
 * @Roles()/RolesGuard and per-resource scoping) - these are not a security boundary.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/my" replace />;
  }
  return <>{children}</>;
}

export function RequireManager({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !user.isManager) {
    return <Navigate to="/my" replace />;
  }
  return <>{children}</>;
}

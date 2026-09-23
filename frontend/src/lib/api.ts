import type {
  Employee,
  Shift,
  Leave,
  Attendance,
  AppNotification,
  LeaveStatus,
  PaginatedResult,
} from './types';

const TOKEN_KEY = 'authToken';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore - private browsing / blocked storage
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

export interface ListParams {
  page?: number;
  pageSize?: number;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'HR';
  hrEmail: string | null;
  isManager: boolean;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string }>('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<Me>('/admin/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ success: boolean }>('/admin/settings/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },
  employees: {
    list: (params: ListParams = {}) =>
      request<PaginatedResult<Employee>>(`/admin/employees${qs(params)}`),
    get: (id: string) => request<Employee>(`/admin/employees/${id}`),
    myReports: () => request<Employee[]>('/admin/employees/my-reports'),
    hrAssigned: () => request<Employee[]>('/admin/employees/hr-assigned'),
    create: (data: EmployeeInput) =>
      request<Employee>('/admin/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: EmployeeInput) =>
      request<Employee>(`/admin/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deactivate: (id: string) =>
      request<Employee>(`/admin/employees/${id}`, { method: 'DELETE' }),
    setPassword: (id: string, password: string) =>
      request<{ success: boolean }>(`/admin/employees/${id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
  },
  shifts: {
    list: (params: ListParams = {}) =>
      request<PaginatedResult<Shift>>(`/admin/shifts${qs(params)}`),
    create: (data: Omit<Shift, 'id'>) =>
      request<Shift>('/admin/shifts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  leaves: {
    list: (params: ListParams & { employeeId?: string } = {}) =>
      request<PaginatedResult<Leave>>(`/admin/leaves${qs(params)}`),
    get: (id: string) => request<Leave>(`/admin/leaves/${id}`),
    applyOwn: (data: {
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
    }) =>
      request<Leave>('/admin/leaves/me', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: Extract<LeaveStatus, 'APPROVED' | 'REJECTED'>) =>
      request<Leave>(`/admin/leaves/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },
  attendance: {
    list: (params: ListParams & { employeeId?: string } = {}) =>
      request<PaginatedResult<Attendance>>(`/admin/attendances${qs(params)}`),
  },
  settings: {
    get: () => request<{ id: string; commonGroupId: string | null }>(
      '/admin/settings',
    ),
    update: (data: { commonGroupId?: string }) =>
      request<{ id: string; commonGroupId: string | null }>(
        '/admin/settings',
        { method: 'PUT', body: JSON.stringify(data) },
      ),
  },
  notifications: {
    list: (params: ListParams & { unreadOnly?: boolean } = {}) =>
      request<PaginatedResult<AppNotification>>(`/notifications${qs(params)}`),
    markRead: (id: string) =>
      request<AppNotification>(`/notifications/${id}/read`, {
        method: 'PUT',
      }),
    markAllRead: () =>
      request<{ count: number }>('/notifications/read-all', {
        method: 'PUT',
      }),
  },
};

export interface EmployeeInput {
  name: string;
  email: string;
  role?: string;
  teamsUserId?: string | null;
  managerEmails?: string[];
  hrEmail?: string | null;
  shiftId?: string | null;
  password?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type Role = 'ADMIN' | 'EMPLOYEE' | 'HR';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type NotificationType =
  | 'LEAVE_APPLIED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED';

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  teamsUserId: string | null;
  role: Role;
  managerEmails: string[];
  hrEmail: string | null;
  isActive: boolean;
  deactivatedAt: string | null;
  isProvisional: boolean;
  shiftId: string | null;
  shift?: Shift | null;
  createdAt: string;
  updatedAt: string;
}

export interface Leave {
  id: string;
  employeeId: string;
  employee?: Employee;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceBreak {
  id: string;
  breakStart: string;
  breakEnd: string | null;
  duration: number;
}

export interface DailyTask {
  id: string;
  taskName: string;
  priority: string;
  estimatedMinutes: number;
  timeTakenMinutes: number;
  status: string;
  remarks: string | null;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  checkIn: string;
  checkOut: string | null;
  workingMinutes: number;
  breakMinutes: number;
  permissionMinutes: number;
  status: string;
  breaks?: AttendanceBreak[];
  dailyTasks?: DailyTask[];
}

export interface AppNotification {
  id: string;
  employeeId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

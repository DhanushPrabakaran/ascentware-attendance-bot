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
  | 'LEAVE_REJECTED'
  | 'LEAVE_CANCELLED';

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface TeamsGroup {
  id: string;
  name: string;
  conversationId: string;
  isDefault: boolean;
  isActive: boolean;
  lastTestedAt: string | null;
  employeeCount?: number;
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
  groups?: Pick<TeamsGroup, 'id' | 'name'>[];
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
  /** Set (with endTime) for leave in hours on startDate - "HH:mm". */
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceBreak {
  id: string;
  breakStart: string;
  breakEnd: string | null;
  duration: number;
  type?: 'break' | 'lunch';
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
  autoCheckedOut?: boolean;
  breaks?: AttendanceBreak[];
  dailyTasks?: DailyTask[];
}

export interface ScheduleSettings {
  remindersEnabled: boolean;
  checkInReminderTime: string;
  checkOutReminderTime: string;
  digestsEnabled: boolean;
  morningDigestTime: string;
  eveningDigestTime: string;
  /** ISO weekdays, 1 = Monday ... 7 = Sunday. */
  workingDays: number[];
}

export interface LeavePolicy {
  leaveType: string;
  annualDays: number;
}

export interface LeaveBalance {
  year: number;
  types: {
    leaveType: string;
    annualDays: number | null;
    usedDays: number;
    pendingDays: number;
    remainingDays: number | null;
    usedMinutes: number;
    pendingMinutes: number;
  }[];
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

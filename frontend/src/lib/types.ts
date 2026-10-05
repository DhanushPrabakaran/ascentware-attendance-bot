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

// ---- Reports (/reports/*) ----

export type DayState = 'working' | 'on_break' | 'checked_out' | 'on_leave' | 'absent';

export interface ReportEmployee {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamsUserId: string | null;
  managerEmails: string[];
  shift: { name: string; startTime: string; endTime: string } | null;
}

export interface DayTask {
  id: string;
  taskName: string;
  priority: string;
  estimatedMinutes: number;
  timeTakenMinutes: number;
  status: string;
  remarks: string | null;
  /** "YYYY-MM-DD" it was carried over from / to, when one task spans days. */
  carriedFromDate?: string | null;
  carriedToDate?: string | null;
  /** Corrections made after the day, newest first. */
  edits?: { at: string; by: string; changes: Record<string, [unknown, unknown]> }[];
}

export interface PersonDay {
  state: DayState;
  checkIn: string | null;
  checkOut: string | null;
  late: boolean;
  autoCheckedOut: boolean;
  workedMinutes: number;
  breakMinutes: number;
  lunchMinutes: number;
  permissionMinutes: number;
  onBreakSince: string | null;
  onBreakType: string | null;
  attendanceIds: string[];
  breaks: { start: string; end: string | null; minutes: number; type: string }[];
  tasks: DayTask[];
  taskStats: {
    planned: number;
    completed: number;
    inProgress: number;
    blocked: number;
    notStarted: number;
    estimatedMinutes: number;
    spentMinutes: number;
  };
  leaves: {
    id: string;
    leaveType: string;
    startTime: string | null;
    endTime: string | null;
    durationMinutes: number | null;
  }[];
  summary: { overallStatus: string; blockerType: string | null; remarks: string | null } | null;
}

export interface DayReport {
  date: string;
  isToday: boolean;
  people: { employee: ReportEmployee; day: PersonDay; canEditTasks: boolean }[];
  totals: {
    people: number;
    working: number;
    onBreak: number;
    checkedOut: number;
    onLeave: number;
    absent: number;
    late: number;
    workedMinutes: number;
    tasksPlanned: number;
    tasksCompleted: number;
    tasksBlocked: number;
  };
}

export interface PeriodStats {
  daysWorked: number;
  workedMinutes: number;
  avgWorkedMinutes: number;
  breakMinutes: number;
  avgCheckIn: string | null;
  lateDays: number;
  leaveDays: number;
  autoCheckOuts: number;
  tasksPlanned: number;
  tasksCompleted: number;
  tasksBlocked: number;
  estimatedMinutes: number;
  spentMinutes: number;
}

export interface PeopleRow {
  employee: ReportEmployee;
  today: DayState;
  stats: PeriodStats;
}

export interface EmployeeReport {
  employee: ReportEmployee & {
    hrEmail: string | null;
    groups: { id: string; name: string }[];
    createdAt: string;
  };
  from: string;
  to: string;
  stats: PeriodStats;
  series: { date: string; state: DayState; workedMinutes: number; breakMinutes: number; late: boolean }[];
  days: { date: string; day: PersonDay; canEditTasks: boolean }[];
}

export interface Attention {
  pendingLeaves: (Leave & { employee: { id: string; name: string } })[];
  autoCheckOuts: (Attendance & { employee: { id: string; name: string } })[];
}

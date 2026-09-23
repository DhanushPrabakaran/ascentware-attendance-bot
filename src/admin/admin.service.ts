import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus, NotificationType, Role, Employee } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getSettings() {
    let settings = await this.prisma.settings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) {
      settings = await this.prisma.settings.create({
        data: { id: 'default' },
      });
    }
    return settings;
  }

  async updateSettings(data: { commonGroupId?: string }) {
    // Settings always exists by this point - getSettings() bootstraps it on first read.
    await this.getSettings();
    return this.prisma.settings.update({
      where: { id: 'default' },
      data,
    });
  }

  /** commonGroupId holds a comma-separated list, not a schema array - avoids a migration. */
  private parseGroupChatIds(raw: string | null): string[] {
    return (raw || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  async getGroupChatIds(): Promise<string[]> {
    const settings = await this.getSettings();
    return this.parseGroupChatIds(settings.commonGroupId);
  }

  /** Called from TeamsAttendanceBot's membersAdded handler when the bot itself joins a
   *  conversation - group announcements should reach it without an admin manually
   *  copying an ID out of a slash command reply. No-op if already registered. */
  async registerGroupChat(conversationId: string) {
    const ids = await this.getGroupChatIds();
    if (ids.includes(conversationId)) return;
    await this.updateSettings({
      commonGroupId: [...ids, conversationId].join(','),
    });
  }

  /** Mirror of registerGroupChat for the membersRemoved event, so a group the bot was
   *  removed from stops being a (now-failing) send target automatically. */
  async unregisterGroupChat(conversationId: string) {
    const ids = await this.getGroupChatIds();
    const next = ids.filter((id) => id !== conversationId);
    if (next.length === ids.length) return;
    await this.updateSettings({ commonGroupId: next.join(',') });
  }

  /** Bcrypt hashes never leave the server via an API response - internal auth flows
   *  (login, change-password) fetch employees directly and keep the field. */
  private omitPasswordHash<T extends { passwordHash?: string | null }>(
    employee: T,
  ): Omit<T, 'passwordHash'> {
    const { passwordHash, ...rest } = employee;
    return rest;
  }

  async getEmployees(
    visibleIds: string[] | 'ALL' = 'ALL',
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
  ) {
    const where = visibleIds === 'ALL' ? undefined : { id: { in: visibleIds } };
    const [rawData, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: { shift: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);
    const data = rawData.map((e) => this.omitPasswordHash(e));
    return { data, total, page, pageSize };
  }

  async createEmployee(data: any) {
    const validData = {
      name: data.name,
      email: data.email,
      role: data.role || 'EMPLOYEE',
      teamsUserId: data.teamsUserId || null,
      managerEmails: data.managerEmails || [],
      hrEmail: data.hrEmail || null,
      shiftId: data.shiftId || null,
      passwordHash: data.password
        ? await bcrypt.hash(data.password, 10)
        : undefined,
    };
    const employee = await this.prisma.employee.create({ data: validData });
    return this.omitPasswordHash(employee);
  }

  async updateEmployee(id: string, data: any) {
    const validData = {
      name: data.name,
      email: data.email,
      role: data.role,
      teamsUserId: data.teamsUserId || null,
      managerEmails: data.managerEmails || [],
      hrEmail: data.hrEmail || null,
      shiftId: data.shiftId || null,
      passwordHash: data.password
        ? await bcrypt.hash(data.password, 10)
        : undefined,
    };
    const employee = await this.prisma.employee.update({
      where: { id },
      data: validData,
    });
    return this.omitPasswordHash(employee);
  }

  /** Soft-delete: keeps attendance/leave history intact instead of hard-deleting the row. */
  async deactivateEmployee(id: string) {
    const employee = await this.prisma.employee.update({
      where: { id },
      data: { isActive: false, deactivatedAt: new Date() },
    });
    return this.omitPasswordHash(employee);
  }

  async findEmployeeByTeamsUserId(teamsUserId: string) {
    return this.prisma.employee.findUnique({
      where: { teamsUserId },
      include: { shift: true },
    });
  }

  async findEmployeeByEmail(email: string) {
    return this.prisma.employee.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
  }

  // Includes passwordHash - only for internal auth flows (getSettings-style callers
  // like AuthService.changeOwnPassword). Anything serving an HTTP response to a
  // client must go through getEmployeeByIdSafe instead.
  async getEmployeeById(id: string) {
    return this.prisma.employee.findUnique({ where: { id } });
  }

  async getEmployeeByIdSafe(id: string) {
    const employee = await this.getEmployeeById(id);
    return employee ? this.omitPasswordHash(employee) : null;
  }

  async setEmployeePassword(id: string, plaintextPassword: string) {
    const passwordHash = await bcrypt.hash(plaintextPassword, 10);
    return this.prisma.employee.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async getManagersForEmployee(employeeId: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!emp || !emp.managerEmails || emp.managerEmails.length === 0) {
      return [];
    }
    return this.prisma.employee.findMany({
      where: { email: { in: emp.managerEmails } },
    });
  }

  async getManagersForTeamsUser(teamsUserId: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { teamsUserId },
    });
    if (!emp) return [];
    return this.getManagersForEmployee(emp.id);
  }

  /**
   * All direct and indirect reports of `managerEmail`. managerEmails lives on the
   * REPORT's own row ("I report to X"), so "who reports to me" is a reverse lookup,
   * walked iteratively (BFS) to also pick up indirect reports (a "super manager" sees
   * their whole sub-org for free, since that's purely a property of the reporting
   * chain, not a separate role). Small/mid-size org chart - O(depth) queries is fine,
   * no closure table or recursive CTE needed.
   */
  async getAllReports(
    managerEmail: string,
  ): Promise<Omit<Employee, 'passwordHash'>[]> {
    const found: Omit<Employee, 'passwordHash'>[] = [];
    // Seeded with the root itself so a cycle in bad data (e.g. two employees
    // accidentally listing each other as manager) can't loop back and count the
    // root - or an already-counted ancestor - as their own report.
    const visitedEmails = new Set<string>([managerEmail]);
    let frontier = [managerEmail];
    let depth = 0;

    while (frontier.length > 0 && depth < 25) {
      const directReports = await this.prisma.employee.findMany({
        where: { managerEmails: { hasSome: frontier } },
      });
      const next: string[] = [];
      for (const emp of directReports) {
        if (visitedEmails.has(emp.email)) continue; // already counted - convergent chain or a cycle
        visitedEmails.add(emp.email);
        found.push(this.omitPasswordHash(emp));
        next.push(emp.email);
      }
      frontier = next;
      depth++;
    }
    return found;
  }

  async isManagerOf(
    managerEmail: string,
    targetEmployeeId: string,
  ): Promise<boolean> {
    const reports = await this.getAllReports(managerEmail);
    return reports.some((e) => e.id === targetEmployeeId);
  }

  async isHrOf(hrEmail: string, targetEmployeeId: string): Promise<boolean> {
    const match = await this.prisma.employee.findFirst({
      where: { id: targetEmployeeId, hrEmail },
    });
    return !!match;
  }

  async getHrAssignedEmployees(hrEmail: string) {
    const employees = await this.prisma.employee.findMany({
      where: { hrEmail },
      include: { shift: true },
    });
    return employees.map((e) => this.omitPasswordHash(e));
  }

  /** ADMIN sees everything; everyone else sees themselves + their reports (+ HR's assigned employees). */
  async getVisibleEmployeeIds(
    requester: JwtPayload,
  ): Promise<string[] | 'ALL'> {
    if (requester.role === Role.ADMIN) return 'ALL';

    const ids = new Set<string>([requester.sub]);
    (await this.getAllReports(requester.email)).forEach((e) => ids.add(e.id));
    if (requester.role === Role.HR) {
      (await this.getHrAssignedEmployees(requester.email)).forEach((e) =>
        ids.add(e.id),
      );
    }
    return Array.from(ids);
  }

  async canViewEmployeeData(
    requester: JwtPayload,
    targetEmployeeId: string,
  ): Promise<boolean> {
    if (requester.role === Role.ADMIN || requester.sub === targetEmployeeId) {
      return true;
    }
    if (await this.isManagerOf(requester.email, targetEmployeeId)) {
      return true;
    }
    if (
      requester.role === Role.HR &&
      (await this.isHrOf(requester.email, targetEmployeeId))
    ) {
      return true;
    }
    return false;
  }

  /** HR is deliberately excluded - HR watches leave outcomes, doesn't approve them. */
  async canManageLeave(
    requester: JwtPayload,
    leave: { employeeId: string },
  ): Promise<boolean> {
    if (requester.role === Role.ADMIN) return true;
    return this.isManagerOf(requester.email, leave.employeeId);
  }

  /**
   * Looks up an employee by a verified corporate email (case-insensitive) and links the
   * given Teams user id onto that existing record. Only creates a new employee - flagged
   * isProvisional for admin review - when no matching HR-provisioned record exists at all.
   * This is what keeps the bot from spawning duplicate "phantom" employees.
   */
  async findOrLinkEmployeeByVerifiedEmail(
    email: string,
    teamsUserId: string,
    name?: string,
  ) {
    const existing = await this.findEmployeeByEmail(email);

    if (existing) {
      if (existing.teamsUserId === teamsUserId) return existing;
      return this.prisma.employee.update({
        where: { id: existing.id },
        data: { teamsUserId },
      });
    }

    return this.prisma.employee.create({
      data: {
        email,
        name: name || email.split('@')[0],
        teamsUserId,
        isProvisional: true,
      },
    });
  }

  async getShifts(page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.shift.count(),
    ]);
    return { data, total, page, pageSize };
  }

  async createShift(data: any) {
    return this.prisma.shift.create({ data });
  }

  /** Resolves an employee's hrEmail to their Employee id, as a 0-or-1-element array
   *  ready to spread into a notification recipient list. */
  private async resolveHrRecipientId(
    hrEmail: string | null,
  ): Promise<string[]> {
    if (!hrEmail) return [];
    const hr = await this.findEmployeeByEmail(hrEmail);
    return hr ? [hr.id] : [];
  }

  async getLeaves(
    visibleIds: string[] | 'ALL' = 'ALL',
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
    employeeId?: string,
  ) {
    if (
      employeeId &&
      visibleIds !== 'ALL' &&
      !visibleIds.includes(employeeId)
    ) {
      throw new ForbiddenException(
        "You cannot view this employee's leave history",
      );
    }

    const where = employeeId
      ? { employeeId }
      : visibleIds === 'ALL'
        ? undefined
        : { employeeId: { in: visibleIds } };

    const [data, total] = await Promise.all([
      this.prisma.leave.findMany({
        where,
        include: { employee: true },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.leave.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getLeaveById(id: string) {
    return this.prisma.leave.findUnique({
      where: { id },
      include: { employee: true },
    });
  }

  async createLeaveForEmployee(
    employeeId: string,
    params: {
      leaveType: string;
      startDate: Date;
      endDate: Date;
      reason: string;
    },
  ) {
    if (params.endDate < params.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    const leave = await this.prisma.leave.create({
      data: { employeeId, ...params },
      include: { employee: true },
    });

    // Notify managers (visibility + who needs to act) and HR (visibility only) that a
    // leave request came in. Fires from here so it fires exactly once regardless of
    // whether the request originated from the bot or the web.
    const managers = await this.getManagersForEmployee(employeeId);
    const recipientIds = managers.map((m) => m.id);
    recipientIds.push(
      ...(await this.resolveHrRecipientId(leave.employee.hrEmail)),
    );
    await this.notifications.createMany(
      recipientIds,
      NotificationType.LEAVE_APPLIED,
      'New leave request',
      `${leave.employee.name} applied for ${leave.leaveType} leave (${leave.startDate.toDateString()} - ${leave.endDate.toDateString()})`,
      `/leaves/${leave.id}`,
    );

    return leave;
  }

  async createLeaveForTeamsUser(
    teamsUserId: string,
    params: {
      leaveType: string;
      startDate: Date;
      endDate: Date;
      reason: string;
    },
  ) {
    const emp = await this.prisma.employee.findUnique({
      where: { teamsUserId },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return this.createLeaveForEmployee(emp.id, params);
  }

  async updateLeaveStatus(id: string, status: LeaveStatus) {
    const leave = await this.prisma.leave.update({
      where: { id },
      data: { status },
      include: { employee: true },
    });

    // Notify the applying employee of the outcome (previously silent - a real gap even
    // before HR existed) and HR for visibility, same as on apply.
    if (status === LeaveStatus.APPROVED || status === LeaveStatus.REJECTED) {
      const notificationType =
        status === LeaveStatus.APPROVED
          ? NotificationType.LEAVE_APPROVED
          : NotificationType.LEAVE_REJECTED;
      const title =
        status === LeaveStatus.APPROVED
          ? 'Leave request approved'
          : 'Leave request rejected';
      const message = `Your ${leave.leaveType} leave (${leave.startDate.toDateString()} - ${leave.endDate.toDateString()}) was ${status.toLowerCase()}.`;

      const recipientIds = [leave.employeeId];
      recipientIds.push(
        ...(await this.resolveHrRecipientId(leave.employee.hrEmail)),
      );
      await this.notifications.createMany(
        recipientIds,
        notificationType,
        title,
        message,
        `/leaves/${leave.id}`,
      );
    }

    return leave;
  }

  async getAttendances(
    visibleIds: string[] | 'ALL' = 'ALL',
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
    employeeId?: string,
  ) {
    if (
      employeeId &&
      visibleIds !== 'ALL' &&
      !visibleIds.includes(employeeId)
    ) {
      throw new ForbiddenException(
        "You cannot view this employee's attendance history",
      );
    }

    const where = employeeId
      ? { employeeId }
      : visibleIds === 'ALL'
        ? undefined
        : { employeeId: { in: visibleIds } };

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: { employee: true, dailyTasks: true, breaks: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }
}

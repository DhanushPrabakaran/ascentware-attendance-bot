import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus, NotificationType, Role, Employee } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';

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

  async getEmployees(visibleIds: string[] | 'ALL' = 'ALL') {
    return this.prisma.employee.findMany({
      where: visibleIds === 'ALL' ? undefined : { id: { in: visibleIds } },
      include: { shift: true },
    });
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
    return this.prisma.employee.create({ data: validData });
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
    return this.prisma.employee.update({ where: { id }, data: validData });
  }

  /** Soft-delete: keeps attendance/leave history intact instead of hard-deleting the row. */
  async deactivateEmployee(id: string) {
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false, deactivatedAt: new Date() },
    });
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

  async getEmployeeById(id: string) {
    return this.prisma.employee.findUnique({ where: { id } });
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
  async getAllReports(managerEmail: string): Promise<Employee[]> {
    const found: Employee[] = [];
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
        found.push(emp);
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
    return this.prisma.employee.findMany({
      where: { hrEmail },
      include: { shift: true },
    });
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

  async getShifts() {
    return this.prisma.shift.findMany();
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

  async getLeaves(visibleIds: string[] | 'ALL' = 'ALL') {
    return this.prisma.leave.findMany({
      where:
        visibleIds === 'ALL' ? undefined : { employeeId: { in: visibleIds } },
      include: { employee: true },
      orderBy: { startDate: 'desc' },
    });
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

  async getAttendances(visibleIds: string[] | 'ALL' = 'ALL') {
    return this.prisma.attendance.findMany({
      where:
        visibleIds === 'ALL' ? undefined : { employeeId: { in: visibleIds } },
      include: { employee: true, dailyTasks: true, breaks: true },
      orderBy: { date: 'desc' },
    });
  }
}

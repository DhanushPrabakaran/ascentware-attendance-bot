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
import { TASK_ORDER } from '../work-plan/work-plan.service';

import {
  calendarDateOf,
  dateKey,
  describeLeavePeriod,
  formatClock,
  nextMidnight,
  parseClockTime,
  startOfDay,
} from '../common/time';

interface LeaveParams {
  leaveType: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  startTime?: string | null; // "HH:mm" - set both for leave in hours
  endTime?: string | null;
}

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

  private lastBotEndpoint?: string;

  /**
   * Remembers the Teams service URL/tenant from the latest incoming bot activity, so the
   * web dashboard can send proactive messages (a group's test message) outside a bot
   * turn. Called on every turn - the in-memory check keeps it to one write per change.
   */
  async rememberBotEndpoint(serviceUrl?: string, tenantId?: string) {
    if (!serviceUrl) return;
    const key = `${serviceUrl}|${tenantId ?? ''}`;
    if (key === this.lastBotEndpoint) return;
    await this.getSettings();
    await this.prisma.settings.update({
      where: { id: 'default' },
      data: { botServiceUrl: serviceUrl, botTenantId: tenantId ?? null },
    });
    this.lastBotEndpoint = key;
  }

  private knownPersonalChats = new Map<string, string>();

  /**
   * Remembers the bot's 1:1 chat with a Teams user (from a message in that chat) so
   * reminders and notices can be sent to them proactively later. Cached in memory so
   * it's one write per user per process, not one per message.
   */
  async rememberPersonalConversation(
    teamsUserId?: string,
    conversationId?: string,
  ) {
    if (!teamsUserId || !conversationId) return;
    if (this.knownPersonalChats.get(teamsUserId) === conversationId) return;
    await this.prisma.employee.updateMany({
      where: {
        teamsUserId,
        OR: [
          { teamsConversationId: null },
          { teamsConversationId: { not: conversationId } },
        ],
      },
      data: { teamsConversationId: conversationId },
    });
    this.knownPersonalChats.set(teamsUserId, conversationId);
  }

  /** Schedule settings for reminders and digests (the Groups screen edits them). */
  async updateScheduleSettings(data: {
    remindersEnabled?: boolean;
    checkInReminderTime?: string;
    checkOutReminderTime?: string;
    digestsEnabled?: boolean;
    morningDigestTime?: string;
    eveningDigestTime?: string;
    workingDays?: number[];
  }) {
    await this.getSettings();
    return this.prisma.settings.update({ where: { id: 'default' }, data });
  }

  async getBotEndpoint() {
    const settings = await this.getSettings();
    return {
      serviceUrl: settings.botServiceUrl,
      tenantId: settings.botTenantId,
    };
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
        include: { shift: true, groups: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);
    const data = rawData.map((e) => this.omitPasswordHash(e));
    return { data, total, page, pageSize };
  }

  /** Rejects unknown group IDs up front (e.g. a group deleted while the edit form was
   *  open) - otherwise Prisma's connect/set fails as a 500. */
  private async assertGroupsExist(groupIds?: string[]) {
    if (!groupIds?.length) return;
    const found = await this.prisma.teamsGroup.count({
      where: { id: { in: groupIds } },
    });
    if (found !== new Set(groupIds).size) {
      throw new BadRequestException(
        'One or more selected groups no longer exist - reload and try again',
      );
    }
  }

  async createEmployee(data: any) {
    await this.assertGroupsExist(data.groupIds);
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
      groups: data.groupIds
        ? { connect: data.groupIds.map((id: string) => ({ id })) }
        : undefined,
    };
    const employee = await this.prisma.employee.create({ data: validData });
    return this.omitPasswordHash(employee);
  }

  async updateEmployee(id: string, data: any) {
    await this.assertGroupsExist(data.groupIds);
    // A field the client didn't send is left as-is (undefined = no change in Prisma);
    // only an explicit empty value clears it. The web edit form never sends
    // teamsUserId, so nulling it on absence unlinked the employee from Teams on every save.
    const orNull = (key: string) =>
      data[key] !== undefined ? data[key] || null : undefined;
    const validData = {
      name: data.name,
      email: data.email,
      role: data.role,
      teamsUserId: orNull('teamsUserId'),
      managerEmails:
        data.managerEmails !== undefined ? data.managerEmails || [] : undefined,
      hrEmail: orNull('hrEmail'),
      shiftId: orNull('shiftId'),
      passwordHash: data.password
        ? await bcrypt.hash(data.password, 10)
        : undefined,
      // Same rule for groups - an older client that omits groupIds must not
      // silently wipe someone's group assignments.
      groups: data.groupIds
        ? { set: data.groupIds.map((id: string) => ({ id })) }
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
    status?: LeaveStatus,
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

    const where = {
      ...(employeeId
        ? { employeeId }
        : visibleIds === 'ALL'
          ? {}
          : { employeeId: { in: visibleIds } }),
      ...(status ? { status } : {}),
    };

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

  /**
   * Full-day leave spans startDate..endDate. Hourly leave ("permission") is a single day
   * with both times set (company wall clock, "HH:mm") - endDate is forced to startDate
   * and the duration is stored so lists/notifications don't have to recompute it.
   */
  private normalizeLeavePeriod(params: LeaveParams) {
    if (isNaN(params.startDate.getTime()) || isNaN(params.endDate.getTime())) {
      throw new BadRequestException('Please choose valid dates');
    }
    const hasStart = !!params.startTime?.trim();
    const hasEnd = !!params.endTime?.trim();
    if (!hasStart && !hasEnd) {
      if (params.endDate < params.startDate) {
        throw new BadRequestException(
          'End date must be on or after start date',
        );
      }
      return {
        ...params,
        startTime: null,
        endTime: null,
        durationMinutes: null,
      };
    }
    if (!hasStart || !hasEnd) {
      throw new BadRequestException(
        'For leave in hours, fill in both the From and To time',
      );
    }
    const from = parseClockTime(params.startTime!);
    const to = parseClockTime(params.endTime!);
    if (from === null || to === null) {
      throw new BadRequestException('Times must be in HH:mm format');
    }
    if (to <= from) {
      throw new BadRequestException('To time must be after From time');
    }
    return {
      ...params,
      startTime: params.startTime!.trim(),
      endTime: params.endTime!.trim(),
      endDate: params.startDate,
      durationMinutes: to - from,
    };
  }

  /** Rejects a request that clashes with one of the employee's pending/approved leaves:
   *  any day in common, unless both are hourly and their times don't intersect. */
  private async assertNoOverlap(
    employeeId: string,
    leave: {
      startDate: Date;
      endDate: Date;
      startTime: string | null;
      endTime: string | null;
    },
  ) {
    const existing = await this.prisma.leave.findMany({
      where: {
        employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: leave.endDate },
        endDate: { gte: leave.startDate },
      },
    });
    const clash = existing.find((other) => {
      if (!leave.startTime || !other.startTime) return true;
      const aFrom = parseClockTime(leave.startTime)!;
      const aTo = parseClockTime(leave.endTime!)!;
      const bFrom = parseClockTime(other.startTime);
      const bTo = parseClockTime(other.endTime || '');
      if (bFrom === null || bTo === null) return true;
      return aFrom < bTo && bFrom < aTo;
    });
    if (clash) {
      throw new BadRequestException(
        `This overlaps your ${clash.status.toLowerCase()} ${clash.leaveType} leave (${describeLeavePeriod(clash)})`,
      );
    }
  }

  async createLeaveForEmployee(employeeId: string, params: LeaveParams) {
    const data = this.normalizeLeavePeriod(params);
    await this.assertNoOverlap(employeeId, data);
    const leave = await this.prisma.leave.create({
      data: { employeeId, ...data },
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
      `${leave.employee.name} applied for ${leave.leaveType} leave (${describeLeavePeriod(leave)})`,
      `/leaves/${leave.id}`,
    );

    return leave;
  }

  async createLeaveForTeamsUser(teamsUserId: string, params: LeaveParams) {
    const emp = await this.prisma.employee.findUnique({
      where: { teamsUserId },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return this.createLeaveForEmployee(emp.id, params);
  }

  async updateLeaveStatus(id: string, status: LeaveStatus) {
    const current = await this.prisma.leave.findUnique({ where: { id } });
    if (current?.status === LeaveStatus.CANCELLED) {
      throw new BadRequestException('This leave was cancelled by the employee');
    }
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
      const message = `Your ${leave.leaveType} leave (${describeLeavePeriod(leave)}) was ${status.toLowerCase()}.`;

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

  /**
   * The employee withdraws their own request - while pending, or once approved as long
   * as it hasn't started yet (an admin can cancel any). Managers and HR are told.
   */
  async cancelLeave(id: string, requester: JwtPayload) {
    const leave = await this.getLeaveById(id);
    if (!leave) throw new NotFoundException('Leave not found');
    const isAdmin = requester.role === Role.ADMIN;
    if (leave.employeeId !== requester.sub && !isAdmin) {
      throw new ForbiddenException('You can only cancel your own leave');
    }
    if (
      leave.status !== LeaveStatus.PENDING &&
      leave.status !== LeaveStatus.APPROVED
    ) {
      throw new BadRequestException(
        `This leave is already ${leave.status.toLowerCase()}`,
      );
    }
    if (
      leave.status === LeaveStatus.APPROVED &&
      !isAdmin &&
      leave.startDate < calendarDateOf(new Date())
    ) {
      throw new BadRequestException(
        'An approved leave that has already started can only be cancelled by an admin',
      );
    }

    const updated = await this.prisma.leave.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
      include: { employee: true },
    });

    const managers = await this.getManagersForEmployee(leave.employeeId);
    const recipientIds = managers.map((m) => m.id);
    recipientIds.push(
      ...(await this.resolveHrRecipientId(leave.employee.hrEmail)),
    );
    await this.notifications.createMany(
      recipientIds.filter((r) => r !== requester.sub),
      NotificationType.LEAVE_CANCELLED,
      'Leave cancelled',
      `${leave.employee.name} cancelled their ${leave.leaveType} leave (${describeLeavePeriod(leave)})`,
      `/leaves/${leave.id}`,
    );
    return updated;
  }

  /** "3 of 12 days used this year" for a type with an allowance, else null - shown to
   *  approvers on the Teams approval card. */
  async describeLeaveBalance(employeeId: string, leaveType: string) {
    const balance = await this.getLeaveBalance(employeeId);
    const type = balance.types.find((t) => t.leaveType === leaveType);
    if (!type || type.annualDays === null) return null;
    const pending = type.pendingDays ? `, ${type.pendingDays} pending` : '';
    return `${type.usedDays} of ${type.annualDays} days used in ${balance.year}${pending}`;
  }

  async getLeavePolicies() {
    return this.prisma.leavePolicy.findMany({ orderBy: { leaveType: 'asc' } });
  }

  async setLeavePolicy(leaveType: string, annualDays: number) {
    const type = leaveType.trim();
    if (!type) throw new BadRequestException('Leave type is required');
    return this.prisma.leavePolicy.upsert({
      where: { leaveType: type },
      create: { leaveType: type, annualDays },
      update: { annualDays },
    });
  }

  async deleteLeavePolicy(leaveType: string) {
    await this.prisma.leavePolicy.deleteMany({ where: { leaveType } });
  }

  /**
   * Leave taken this calendar year per type. Full-day leave counts working days only
   * (Settings.workingDays) - hourly leave is totalled in minutes separately and never
   * eats into the day allowance. Pending requests are shown apart from approved ones.
   */
  async getLeaveBalance(
    employeeId: string,
    year = new Date().getUTCFullYear(),
  ) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31));
    const [leaves, policies, settings] = await Promise.all([
      this.prisma.leave.findMany({
        where: {
          employeeId,
          status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
          startDate: { lte: yearEnd },
          endDate: { gte: yearStart },
        },
      }),
      this.getLeavePolicies(),
      this.getSettings(),
    ]);

    const workingDays = new Set(
      settings.workingDays?.length ? settings.workingDays : [1, 2, 3, 4, 5],
    );
    const byType = new Map<
      string,
      {
        leaveType: string;
        annualDays: number | null;
        usedDays: number;
        pendingDays: number;
        usedMinutes: number;
        pendingMinutes: number;
      }
    >();
    const entry = (leaveType: string) => {
      let e = byType.get(leaveType);
      if (!e) {
        e = {
          leaveType,
          annualDays: null,
          usedDays: 0,
          pendingDays: 0,
          usedMinutes: 0,
          pendingMinutes: 0,
        };
        byType.set(leaveType, e);
      }
      return e;
    };
    policies.forEach((p) => (entry(p.leaveType).annualDays = p.annualDays));

    for (const leave of leaves) {
      const e = entry(leave.leaveType);
      const approved = leave.status === LeaveStatus.APPROVED;
      if (leave.durationMinutes != null) {
        if (approved) e.usedMinutes += leave.durationMinutes;
        else e.pendingMinutes += leave.durationMinutes;
        continue;
      }
      const from = Math.max(leave.startDate.getTime(), yearStart.getTime());
      const to = Math.min(leave.endDate.getTime(), yearEnd.getTime());
      let days = 0;
      for (let t = from; t <= to; t += 24 * 3600 * 1000) {
        const weekday = new Date(t).getUTCDay() || 7;
        if (workingDays.has(weekday)) days++;
      }
      if (approved) e.usedDays += days;
      else e.pendingDays += days;
    }

    return {
      year,
      types: Array.from(byType.values())
        .map((e) => ({
          ...e,
          remainingDays:
            e.annualDays === null ? null : e.annualDays - e.usedDays,
        }))
        .sort((a, b) => a.leaveType.localeCompare(b.leaveType)),
    };
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
        include: {
          employee: true,
          dailyTasks: { orderBy: TASK_ORDER },
          breaks: true,
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  /**
   * Timesheet CSV: one row per attendance session between two calendar days (company
   * timezone, inclusive), limited to the employees the requester can see.
   */
  async exportAttendancesCsv(
    visibleIds: string[] | 'ALL',
    from: string,
    to: string,
    employeeId?: string,
  ) {
    if (
      employeeId &&
      visibleIds !== 'ALL' &&
      !visibleIds.includes(employeeId)
    ) {
      throw new ForbiddenException(
        "You cannot export this employee's attendance",
      );
    }
    // Noon UTC lands on the intended calendar day in any office timezone.
    const rangeStart = startOfDay(new Date(`${from.slice(0, 10)}T12:00:00Z`));
    const rangeEnd = nextMidnight(new Date(`${to.slice(0, 10)}T12:00:00Z`));
    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      throw new BadRequestException('Please choose valid dates');
    }
    if (rangeEnd <= rangeStart) {
      throw new BadRequestException('"To" must be on or after "From"');
    }
    if (rangeEnd.getTime() - rangeStart.getTime() > 400 * 24 * 3600 * 1000) {
      throw new BadRequestException('Export at most about a year at a time');
    }

    const rows = await this.prisma.attendance.findMany({
      where: {
        checkIn: { gte: rangeStart, lt: rangeEnd },
        ...(employeeId
          ? { employeeId }
          : visibleIds === 'ALL'
            ? {}
            : { employeeId: { in: visibleIds } }),
      },
      include: {
        employee: { select: { name: true, email: true } },
        breaks: { select: { type: true, duration: true } },
        dailyTasks: { select: { status: true } },
      },
      orderBy: [{ checkIn: 'asc' }],
    });

    const clock = (d: Date | null) => (d ? formatClock(d) : '');
    const hours = (minutes: number) => (minutes / 60).toFixed(2);

    const header = [
      'Date',
      'Employee',
      'Email',
      'Check in',
      'Check out',
      'Auto check-out',
      'Worked (hrs)',
      'Breaks (hrs)',
      'Lunch (hrs)',
      'Permission (hrs)',
      'Tasks planned',
      'Tasks completed',
    ];
    const lines = [header.map(csvCell).join(',')];
    for (const a of rows) {
      const lunch = a.breaks
        .filter((b) => b.type === 'lunch')
        .reduce((sum, b) => sum + b.duration, 0);
      lines.push(
        [
          dateKey(a.checkIn),
          a.employee.name,
          a.employee.email,
          clock(a.checkIn),
          a.status === 'checked_out' ? clock(a.checkOut) : 'still open',
          a.autoCheckedOut ? 'Yes' : 'No',
          hours(a.workingMinutes),
          hours(a.breakMinutes - lunch),
          hours(lunch),
          hours(a.permissionMinutes),
          String(a.dailyTasks.length),
          String(a.dailyTasks.filter((t) => t.status === 'completed').length),
        ]
          .map(csvCell)
          .join(','),
      );
    }
    // BOM so Excel opens it as UTF-8 (names with non-ASCII characters).
    return '\uFEFF' + lines.join('\r\n') + '\r\n';
  }
}

/** Quotes a CSV cell, and defuses spreadsheet formulas in user-entered text. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

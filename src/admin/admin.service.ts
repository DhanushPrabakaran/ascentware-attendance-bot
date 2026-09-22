import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.settings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) {
      // First boot against a fresh, unseeded database: bootstrap a random admin
      // password rather than crashing (adminPasswordHash has no schema default).
      const generatedPassword = crypto.randomBytes(12).toString('base64url');
      const adminPasswordHash = await bcrypt.hash(generatedPassword, 10);
      settings = await this.prisma.settings.create({
        data: { id: 'default', adminPasswordHash },
      });
      console.warn(
        `[AdminService] No Settings row existed - generated an admin password: "${generatedPassword}". ` +
          'Log in with it and change it immediately via POST /api/v1/admin/settings/password.',
      );
    }
    return settings;
  }

  async updateAdminPasswordHash(adminPasswordHash: string) {
    return this.prisma.settings.update({
      where: { id: 'default' },
      data: { adminPasswordHash },
    });
  }

  async updateSettings(data: { commonGroupId?: string; adminEmail?: string }) {
    // Settings always exists by this point - getSettings() bootstraps it on first read.
    await this.getSettings();
    return this.prisma.settings.update({
      where: { id: 'default' },
      data,
    });
  }

  async getEmployees() {
    return this.prisma.employee.findMany({ include: { shift: true } });
  }

  async createEmployee(data: any) {
    const validData = {
      name: data.name,
      email: data.email,
      role: data.role || 'EMPLOYEE',
      teamsUserId: data.teamsUserId || null,
      managerEmails: data.managerEmails || [],
      shiftId: data.shiftId || null,
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
      shiftId: data.shiftId || null,
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

  async getManagersForTeamsUser(teamsUserId: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { teamsUserId },
    });
    if (!emp || !emp.managerEmails || emp.managerEmails.length === 0) {
      return [];
    }
    return this.prisma.employee.findMany({
      where: { email: { in: emp.managerEmails } },
    });
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
    const existing = await this.prisma.employee.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

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

  async getLeaves() {
    return this.prisma.leave.findMany({
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
    return this.prisma.leave.create({
      data: { employeeId, ...params },
    });
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
    return this.prisma.leave.update({
      where: { id },
      data: { status },
    });
  }

  async getAttendances() {
    return this.prisma.attendance.findMany({
      include: { employee: true, dailyTasks: true, breaks: true },
      orderBy: { date: 'desc' },
    });
  }
}

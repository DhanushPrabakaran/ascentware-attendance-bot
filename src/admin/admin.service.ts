import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.settings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) {
      settings = await this.prisma.settings.create({ data: { id: 'default' } });
    }
    return settings;
  }

  async updateSettings(data: { commonGroupId?: string; adminEmail?: string }) {
    return this.prisma.settings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
  }

  async getEmployees() {
    return this.prisma.employee.findMany({ include: { shift: true } });
  }

  async createEmployee(data: any) {
    return this.prisma.employee.create({ data });
  }

  async updateEmployee(id: string, data: any) {
    return this.prisma.employee.update({ where: { id }, data });
  }

  async deleteEmployee(id: string) {
    return this.prisma.employee.delete({ where: { id } });
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
      orderBy: { date: 'desc' },
    });
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() data: any) {
    return this.adminService.updateSettings(data);
  }

  @Get('employees')
  getEmployees() {
    return this.adminService.getEmployees();
  }

  @Post('employees')
  createEmployee(@Body() data: any) {
    return this.adminService.createEmployee(data);
  }

  @Put('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateEmployee(id, data);
  }

  @Delete('employees/:id')
  deleteEmployee(@Param('id') id: string) {
    return this.adminService.deleteEmployee(id);
  }

  @Get('employees/teams/:teamsUserId')
  async getEmployeeByTeams(@Param('teamsUserId') teamsUserId: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { teamsUserId },
      include: { shift: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  @Get('employees/teams/:teamsUserId/managers')
  async getManagers(@Param('teamsUserId') teamsUserId: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { teamsUserId },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    if (!emp.managerEmails || emp.managerEmails.length === 0) return [];
    return this.prisma.employee.findMany({
      where: { email: { in: emp.managerEmails } },
    });
  }

  @Post('login')
  async login(@Body() data: any) {
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) throw new NotFoundException('Settings not found');

    if (
      data.username === settings.adminUsername &&
      data.password === settings.adminPassword
    ) {
      return { success: true, token: 'fake-jwt-token-for-local' };
    }

    throw new NotFoundException('Invalid credentials');
  }

  @Post('employees/link')
  async linkEmployee(@Body() data: { email: string; teamsUserId: string }) {
    const emp = await this.prisma.employee.findUnique({
      where: { email: data.email },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({
      where: { id: emp.id },
      data: { teamsUserId: data.teamsUserId },
    });
  }

  @Get('shifts')
  getShifts() {
    return this.adminService.getShifts();
  }

  @Post('shifts')
  createShift(@Body() data: any) {
    return this.adminService.createShift(data);
  }

  @Get('leaves')
  getLeaves() {
    return this.adminService.getLeaves();
  }

  @Post('leaves')
  async applyLeave(@Body() data: { teamsUserId: string; reason: string }) {
    const emp = await this.prisma.employee.findUnique({
      where: { teamsUserId: data.teamsUserId },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return this.prisma.leave.create({
      data: { employeeId: emp.id, reason: data.reason },
    });
  }
}

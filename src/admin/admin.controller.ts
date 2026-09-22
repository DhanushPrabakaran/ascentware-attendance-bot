import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { LeaveStatus, Role } from '@prisma/client';

@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(Role.ADMIN)
  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Roles(Role.ADMIN)
  @Put('settings')
  updateSettings(@Body() data: any) {
    return this.adminService.updateSettings(data);
  }

  @Get('employees')
  async getEmployees(@CurrentUser() user: JwtPayload) {
    const visibleIds = await this.adminService.getVisibleEmployeeIds(user);
    return this.adminService.getEmployees(visibleIds);
  }

  @Roles(Role.ADMIN)
  @Post('employees')
  createEmployee(@Body() data: any) {
    return this.adminService.createEmployee(data);
  }

  @Roles(Role.ADMIN)
  @Put('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateEmployee(id, data);
  }

  @Roles(Role.ADMIN)
  @Delete('employees/:id')
  deactivateEmployee(@Param('id') id: string) {
    return this.adminService.deactivateEmployee(id);
  }

  @Roles(Role.ADMIN)
  @Post('employees/:id/password')
  async setEmployeePassword(
    @Param('id') id: string,
    @Body('password') password: string,
  ) {
    await this.adminService.setEmployeePassword(id, password);
    return { success: true };
  }

  // Must stay above any future `employees/:id` GET route, or "my-reports"/"hr-assigned"
  // would be captured as the :id param instead.
  @Get('employees/my-reports')
  getMyReports(@CurrentUser() user: JwtPayload) {
    return this.adminService.getAllReports(user.email);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Get('employees/hr-assigned')
  getHrAssignedEmployees(@CurrentUser() user: JwtPayload) {
    return this.adminService.getHrAssignedEmployees(user.email);
  }

  @Get('shifts')
  getShifts() {
    return this.adminService.getShifts();
  }

  @Roles(Role.ADMIN)
  @Post('shifts')
  createShift(@Body() data: any) {
    return this.adminService.createShift(data);
  }

  @Get('leaves')
  async getLeaves(@CurrentUser() user: JwtPayload) {
    const visibleIds = await this.adminService.getVisibleEmployeeIds(user);
    return this.adminService.getLeaves(visibleIds);
  }

  @Get('attendances')
  async getAttendances(@CurrentUser() user: JwtPayload) {
    const visibleIds = await this.adminService.getVisibleEmployeeIds(user);
    return this.adminService.getAttendances(visibleIds);
  }

  @Post('leaves/me')
  applyOwnLeave(
    @CurrentUser() user: JwtPayload,
    @Body()
    data: {
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
    },
  ) {
    return this.adminService.createLeaveForEmployee(user.sub, {
      leaveType: data.leaveType,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
    });
  }

  @Get('leaves/:id')
  async getLeave(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const leave = await this.adminService.getLeaveById(id);
    if (!leave) throw new NotFoundException('Leave not found');
    if (
      !(await this.adminService.canViewEmployeeData(user, leave.employeeId))
    ) {
      throw new ForbiddenException('You cannot view this leave request');
    }
    return leave;
  }

  @Put('leaves/:id/status')
  async updateLeaveStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('status') status: LeaveStatus,
  ) {
    const leave = await this.adminService.getLeaveById(id);
    if (!leave) throw new NotFoundException('Leave not found');
    if (!(await this.adminService.canManageLeave(user, leave))) {
      throw new ForbiddenException(
        'You are not authorized to approve or reject this leave request',
      );
    }
    return this.adminService.updateLeaveStatus(id, status);
  }
}

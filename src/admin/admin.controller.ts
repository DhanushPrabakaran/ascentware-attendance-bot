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
import { LeaveStatus } from '@prisma/client';

@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
  deactivateEmployee(@Param('id') id: string) {
    return this.adminService.deactivateEmployee(id);
  }

  @Get('employees/teams/:teamsUserId')
  async getEmployeeByTeams(@Param('teamsUserId') teamsUserId: string) {
    const emp = await this.adminService.findEmployeeByTeamsUserId(teamsUserId);
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  @Get('employees/teams/:teamsUserId/managers')
  getManagers(@Param('teamsUserId') teamsUserId: string) {
    return this.adminService.getManagersForTeamsUser(teamsUserId);
  }

  @Post('employees/link')
  linkEmployee(
    @Body() data: { email: string; teamsUserId: string; name?: string },
  ) {
    return this.adminService.findOrLinkEmployeeByVerifiedEmail(
      data.email,
      data.teamsUserId,
      data.name,
    );
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

  @Get('attendances')
  getAttendances() {
    return this.adminService.getAttendances();
  }

  @Post('leaves')
  applyLeave(
    @Body()
    data: {
      teamsUserId: string;
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
    },
  ) {
    return this.adminService.createLeaveForTeamsUser(data.teamsUserId, {
      leaveType: data.leaveType,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
    });
  }

  @Get('leaves/:id')
  getLeave(@Param('id') id: string) {
    return this.adminService.getLeaveById(id);
  }

  @Put('leaves/:id/status')
  updateLeaveStatus(
    @Param('id') id: string,
    @Body('status') status: LeaveStatus,
  ) {
    return this.adminService.updateLeaveStatus(id, status);
  }
}

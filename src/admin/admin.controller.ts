import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { AttendanceService } from '../attendance/attendance.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '@prisma/client';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { EmployeeScopedPaginationQueryDto } from '../common/dto/employee-scoped-pagination-query.dto';
import {
  AttendanceExportQueryDto,
  CorrectCheckOutDto,
  LeaveBalanceQueryDto,
  LeaveListQueryDto,
  LeavePolicyDto,
  ScheduleSettingsDto,
} from './dto/attendance-tools.dto';

@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Roles(Role.ADMIN)
  @Get('settings/schedule')
  async getScheduleSettings() {
    return pickSchedule(await this.adminService.getSettings());
  }

  @Roles(Role.ADMIN)
  @Put('settings/schedule')
  async updateScheduleSettings(@Body() dto: ScheduleSettingsDto) {
    return pickSchedule(await this.adminService.updateScheduleSettings(dto));
  }

  @Get('employees')
  async getEmployees(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    const visibleIds = await this.adminService.getVisibleEmployeeIds(user);
    return this.adminService.getEmployees(
      visibleIds,
      query.page,
      query.pageSize,
    );
  }

  @Roles(Role.ADMIN)
  @Post('employees')
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.adminService.createEmployee(dto);
  }

  @Roles(Role.ADMIN)
  @Put('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.adminService.updateEmployee(id, dto);
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
    @Body() dto: SetPasswordDto,
  ) {
    await this.adminService.setEmployeePassword(id, dto.password);
    return { success: true };
  }

  // Must stay above the `employees/:id` GET route below, or "my-reports"/"hr-assigned"
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

  @Get('employees/:id')
  async getEmployee(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const employee = await this.adminService.getEmployeeByIdSafe(id);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!(await this.adminService.canViewEmployeeData(user, id))) {
      throw new ForbiddenException('You cannot view this employee');
    }
    return employee;
  }

  @Get('shifts')
  getShifts(@Query() query: PaginationQueryDto) {
    return this.adminService.getShifts(query.page, query.pageSize);
  }

  @Roles(Role.ADMIN)
  @Post('shifts')
  createShift(@Body() dto: CreateShiftDto) {
    return this.adminService.createShift(dto);
  }

  @Get('leaves')
  async getLeaves(
    @CurrentUser() user: JwtPayload,
    @Query() query: LeaveListQueryDto,
  ) {
    const visibleIds = await this.adminService.getVisibleEmployeeIds(user);
    return this.adminService.getLeaves(
      visibleIds,
      query.page,
      query.pageSize,
      query.employeeId,
      query.status,
    );
  }

  @Get('attendances')
  async getAttendances(
    @CurrentUser() user: JwtPayload,
    @Query() query: EmployeeScopedPaginationQueryDto,
  ) {
    const visibleIds = await this.adminService.getVisibleEmployeeIds(user);
    return this.adminService.getAttendances(
      visibleIds,
      query.page,
      query.pageSize,
      query.employeeId,
    );
  }

  @Get('attendances/export')
  async exportAttendances(
    @CurrentUser() user: JwtPayload,
    @Query() query: AttendanceExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const visibleIds = await this.adminService.getVisibleEmployeeIds(user);
    const csv = await this.adminService.exportAttendancesCsv(
      visibleIds,
      query.from,
      query.to,
      query.employeeId,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="timesheet-${query.from.slice(0, 10)}-to-${query.to.slice(0, 10)}.csv"`,
    );
    return csv;
  }

  /** Managers, HR and admins can fix anyone they can see; an employee can fix only
   *  their own automatic check-outs. */
  @Put('attendances/:id/check-out')
  async correctCheckOut(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CorrectCheckOutDto,
  ) {
    const attendance = await this.attendanceService.findById(id);
    if (!attendance) throw new NotFoundException('Attendance not found');
    const isSelf = attendance.employeeId === user.sub;
    if (
      !(await this.adminService.canViewEmployeeData(
        user,
        attendance.employeeId,
      )) ||
      (isSelf && user.role !== Role.ADMIN && !attendance.autoCheckedOut)
    ) {
      throw new ForbiddenException('You cannot change this check-out');
    }
    return this.attendanceService.correctCheckOut(id, dto.time);
  }

  @Get('leaves/balance')
  async getLeaveBalance(
    @CurrentUser() user: JwtPayload,
    @Query() query: LeaveBalanceQueryDto,
  ) {
    const employeeId = query.employeeId ?? user.sub;
    if (!(await this.adminService.canViewEmployeeData(user, employeeId))) {
      throw new ForbiddenException("You cannot view this employee's leave");
    }
    return this.adminService.getLeaveBalance(employeeId, query.year);
  }

  @Get('leave-policies')
  getLeavePolicies() {
    return this.adminService.getLeavePolicies();
  }

  @Roles(Role.ADMIN)
  @Put('leave-policies')
  setLeavePolicy(@Body() dto: LeavePolicyDto) {
    return this.adminService.setLeavePolicy(dto.leaveType, dto.annualDays);
  }

  @Roles(Role.ADMIN)
  @Delete('leave-policies/:leaveType')
  async deleteLeavePolicy(@Param('leaveType') leaveType: string) {
    await this.adminService.deleteLeavePolicy(leaveType);
    return { success: true };
  }

  @Post('leaves/:id/cancel')
  cancelLeave(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.adminService.cancelLeave(id, user);
  }

  @Post('leaves/me')
  applyOwnLeave(@CurrentUser() user: JwtPayload, @Body() dto: CreateLeaveDto) {
    return this.adminService.createLeaveForEmployee(user.sub, {
      leaveType: dto.leaveType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      reason: dto.reason,
      startTime: dto.startTime,
      endTime: dto.endTime,
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
    @Body() dto: UpdateLeaveStatusDto,
  ) {
    const leave = await this.adminService.getLeaveById(id);
    if (!leave) throw new NotFoundException('Leave not found');
    if (!(await this.adminService.canManageLeave(user, leave))) {
      throw new ForbiddenException(
        'You are not authorized to approve or reject this leave request',
      );
    }
    return this.adminService.updateLeaveStatus(id, dto.status);
  }
}

/** Only the reminder/digest fields - Settings also holds bot plumbing the UI doesn't need. */
function pickSchedule(settings: {
  remindersEnabled: boolean;
  checkInReminderTime: string;
  checkOutReminderTime: string;
  digestsEnabled: boolean;
  morningDigestTime: string;
  eveningDigestTime: string;
  workingDays: number[];
}) {
  return {
    remindersEnabled: settings.remindersEnabled,
    checkInReminderTime: settings.checkInReminderTime,
    checkOutReminderTime: settings.checkOutReminderTime,
    digestsEnabled: settings.digestsEnabled,
    morningDigestTime: settings.morningDigestTime,
    eveningDigestTime: settings.eveningDigestTime,
    workingDays: settings.workingDays,
  };
}

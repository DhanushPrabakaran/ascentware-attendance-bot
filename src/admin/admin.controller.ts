import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '@prisma/client';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { EmployeeScopedPaginationQueryDto } from '../common/dto/employee-scoped-pagination-query.dto';

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
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
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
    @Query() query: EmployeeScopedPaginationQueryDto,
  ) {
    const visibleIds = await this.adminService.getVisibleEmployeeIds(user);
    return this.adminService.getLeaves(
      visibleIds,
      query.page,
      query.pageSize,
      query.employeeId,
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

  @Post('leaves/me')
  applyOwnLeave(@CurrentUser() user: JwtPayload, @Body() dto: CreateLeaveDto) {
    return this.adminService.createLeaveForEmployee(user.sub, {
      leaveType: dto.leaveType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      reason: dto.reason,
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

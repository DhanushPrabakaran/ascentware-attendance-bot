import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkPlanService } from './work-plan.service';
import { SaveDailyPlanDto } from './dto/save-daily-plan.dto';
import { UpdateTaskProgressDto } from './dto/update-task-progress.dto';
import { BulkUpdateTaskDto } from './dto/bulk-update-task.dto';
import { SaveSummaryDto } from './dto/save-summary.dto';
import { AttendanceService } from '../attendance/attendance.service';
import { AdminService } from '../admin/admin.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/work-plan')
export class WorkPlanController {
  constructor(
    private readonly workPlanService: WorkPlanService,
    private readonly attendanceService: AttendanceService,
    private readonly adminService: AdminService,
  ) {}

  // Raw writes, not scoped to an owner: the bot calls WorkPlanService directly, so these
  // stay admin-only. People correct their own past tasks via PATCH /reports/tasks/:id,
  // which checks who may edit what and records each change.
  @Roles(Role.ADMIN)
  @Post()
  saveDailyPlan(@Body() dto: SaveDailyPlanDto) {
    return this.workPlanService.saveDailyPlan(
      dto.attendanceId,
      dto.tasks,
      dto.permissionMinutes,
    );
  }

  @Roles(Role.ADMIN)
  @Put('bulk-progress')
  bulkUpdateProgress(@Body() dto: BulkUpdateTaskDto) {
    return this.workPlanService.bulkUpdateTaskProgress(dto.tasks);
  }

  @Roles(Role.ADMIN)
  @Put(':id/progress')
  updateProgress(@Param('id') id: string, @Body() dto: UpdateTaskProgressDto) {
    return this.workPlanService.updateTaskProgress(id, dto);
  }

  @Roles(Role.ADMIN)
  @Post('summary')
  saveSummary(@Body() dto: SaveSummaryDto) {
    const { attendanceId, ...rest } = dto;
    return this.workPlanService.saveSummary(attendanceId, rest);
  }

  @Get(':attendanceId')
  async getTasks(
    @CurrentUser() user: JwtPayload,
    @Param('attendanceId') attendanceId: string,
  ) {
    const attendance = await this.attendanceService.findById(attendanceId);
    if (!attendance) throw new NotFoundException('Attendance not found');
    if (
      !(await this.adminService.canViewEmployeeData(
        user,
        attendance.employeeId,
      ))
    ) {
      throw new ForbiddenException('You cannot view this attendance record');
    }
    return this.workPlanService.getTasksByAttendanceId(attendanceId);
  }
}

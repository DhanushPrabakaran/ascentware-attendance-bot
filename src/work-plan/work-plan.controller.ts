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

@Controller('api/v1/work-plan')
export class WorkPlanController {
  constructor(
    private readonly workPlanService: WorkPlanService,
    private readonly attendanceService: AttendanceService,
    private readonly adminService: AdminService,
  ) {}

  @Post()
  saveDailyPlan(@Body() dto: SaveDailyPlanDto) {
    return this.workPlanService.saveDailyPlan(
      dto.attendanceId,
      dto.tasks,
      dto.permissionMinutes,
    );
  }

  @Put('bulk-progress')
  bulkUpdateProgress(@Body() dto: BulkUpdateTaskDto) {
    return this.workPlanService.bulkUpdateTaskProgress(dto.tasks);
  }

  @Put(':id/progress')
  updateProgress(@Param('id') id: string, @Body() dto: UpdateTaskProgressDto) {
    return this.workPlanService.updateTaskProgress(id, dto);
  }

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

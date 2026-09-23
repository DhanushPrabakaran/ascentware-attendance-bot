import { Controller, Post, Body, Get, Put, Param } from '@nestjs/common';
import { WorkPlanService } from './work-plan.service';
import { SaveDailyPlanDto } from './dto/save-daily-plan.dto';
import { UpdateTaskProgressDto } from './dto/update-task-progress.dto';
import { BulkUpdateTaskDto } from './dto/bulk-update-task.dto';
import { SaveSummaryDto } from './dto/save-summary.dto';

@Controller('api/v1/work-plan')
export class WorkPlanController {
  constructor(private readonly workPlanService: WorkPlanService) {}

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
  getTasks(@Param('attendanceId') attendanceId: string) {
    return this.workPlanService.getTasksByAttendanceId(attendanceId);
  }
}

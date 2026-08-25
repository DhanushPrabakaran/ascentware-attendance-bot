import { Controller, Post, Body, Get, Put, Param } from '@nestjs/common';
import { WorkPlanService } from './work-plan.service';

@Controller('api/v1/work-plan')
export class WorkPlanController {
  constructor(private readonly workPlanService: WorkPlanService) {}

  @Post()
  saveDailyPlan(@Body() body: any) {
    const { attendanceId, tasks, permissionMinutes } = body;
    return this.workPlanService.saveDailyPlan(attendanceId, tasks, permissionMinutes);
  }

  @Put('bulk-progress')
  bulkUpdateProgress(@Body('tasks') tasks: any[]) {
    return this.workPlanService.bulkUpdateTaskProgress(tasks);
  }

  @Put(':id/progress')
  updateProgress(@Param('id') id: string, @Body() data: any) {
    return this.workPlanService.updateTaskProgress(id, data);
  }

  @Post('summary')
  saveSummary(@Body() data: any) {
    const { attendanceId, overallStatus, blockerType, remarks } = data;
    return this.workPlanService.saveSummary(attendanceId, { overallStatus, blockerType, remarks });
  }

  @Get(':attendanceId')
  getTasks(@Param('attendanceId') attendanceId: string) {
    return this.workPlanService.getTasksByAttendanceId(attendanceId);
  }
}

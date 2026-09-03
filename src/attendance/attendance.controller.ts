import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('api/v1/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('status/:teamsUserId')
  getStatus(@Param('teamsUserId') teamsUserId: string) {
    return this.attendanceService.getStatus(teamsUserId);
  }

  @Post('check-in')
  checkIn(@Body('employeeId') employeeId: string) {
    return this.attendanceService.checkIn(employeeId);
  }

  @Post('check-out')
  checkOut(@Body('attendanceId') attendanceId: string) {
    return this.attendanceService.checkOut(attendanceId);
  }

  @Post('break/start')
  startBreak(@Body('attendanceId') attendanceId: string) {
    return this.attendanceService.startBreak(attendanceId);
  }

  @Post('break/end')
  endBreak(@Body('attendanceId') attendanceId: string) {
    return this.attendanceService.endBreak(attendanceId);
  }
}

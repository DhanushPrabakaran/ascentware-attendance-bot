import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { StartBreakDto } from './dto/start-break.dto';
import { EndBreakDto } from './dto/end-break.dto';

@Controller('api/v1/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('status/:teamsUserId')
  getStatus(@Param('teamsUserId') teamsUserId: string) {
    return this.attendanceService.getStatus(teamsUserId);
  }

  @Post('check-in')
  checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto.teamsUserId);
  }

  @Post('check-out')
  checkOut(@Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(dto.attendanceId);
  }

  @Post('break/start')
  startBreak(@Body() dto: StartBreakDto) {
    return this.attendanceService.startBreak(dto.attendanceId);
  }

  @Post('break/end')
  endBreak(@Body() dto: EndBreakDto) {
    return this.attendanceService.endBreak(dto.attendanceId);
  }
}

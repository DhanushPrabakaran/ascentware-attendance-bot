import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AutoCheckoutService } from './auto-checkout.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AutoCheckoutService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

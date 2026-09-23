import { Module } from '@nestjs/common';
import { WorkPlanService } from './work-plan.service';
import { WorkPlanController } from './work-plan.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AttendanceModule, AdminModule],
  controllers: [WorkPlanController],
  providers: [WorkPlanService],
  exports: [WorkPlanService],
})
export class WorkPlanModule {}

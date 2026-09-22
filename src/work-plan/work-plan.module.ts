import { Module } from '@nestjs/common';
import { WorkPlanService } from './work-plan.service';
import { WorkPlanController } from './work-plan.controller';

@Module({
  controllers: [WorkPlanController],
  providers: [WorkPlanService],
  exports: [WorkPlanService],
})
export class WorkPlanModule {}

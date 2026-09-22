import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { BotHelper } from './BotHelper';
import { WorkflowEngine } from './workflows/workflow.engine';
import { ActivityTrackerService } from './services/activity-tracker.service';
import { workflowHandlerProviders } from './workflows/handlers';
import { AttendanceModule } from '../attendance/attendance.module';
import { WorkPlanModule } from '../work-plan/work-plan.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AttendanceModule, WorkPlanModule, AdminModule],
  controllers: [BotController],
  providers: [
    BotService,
    BotHelper,
    WorkflowEngine,
    ActivityTrackerService,
    ...workflowHandlerProviders,
  ],
})
export class BotModule {}

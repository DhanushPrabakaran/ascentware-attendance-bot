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
import { GroupsModule } from '../groups/groups.module';
import { GroupsController } from './groups.controller';
import { SchedulerService } from './scheduler/scheduler.service';
import { TeamDayService } from './scheduler/team-day.service';
import { KeepAwakeService } from './scheduler/keep-awake.service';

@Module({
  imports: [AttendanceModule, WorkPlanModule, AdminModule, GroupsModule],
  controllers: [BotController, GroupsController],
  providers: [
    BotService,
    BotHelper,
    WorkflowEngine,
    ActivityTrackerService,
    SchedulerService,
    TeamDayService,
    KeepAwakeService,
    ...workflowHandlerProviders,
  ],
})
export class BotModule {}

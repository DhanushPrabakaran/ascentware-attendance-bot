import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';

import { WorkflowEngine } from './workflows/workflow.engine';
import { CheckInHandler } from './workflows/handlers/checkin.handler';
import { ApplyLeaveHandler } from './workflows/handlers/apply-leave.handler';
import { SubmitLeaveHandler } from './workflows/handlers/submit-leave.handler';
import { CancelPlanTasksHandler } from './workflows/handlers/cancel-plan-tasks.handler';
import { SaveAllTasksHandler } from './workflows/handlers/save-all-tasks.handler';
import { StartBreakHandler } from './workflows/handlers/start-break.handler';
import { EndBreakHandler } from './workflows/handlers/end-break.handler';
import { CheckOutHandler } from './workflows/handlers/checkout.handler';
import { SubmitReviewHandler } from './workflows/handlers/submit-review.handler';

@Module({
  controllers: [BotController],
  providers: [
    BotService,
    WorkflowEngine,
    CheckInHandler,
    ApplyLeaveHandler,
    SubmitLeaveHandler,
    CancelPlanTasksHandler,
    SaveAllTasksHandler,
    StartBreakHandler,
    EndBreakHandler,
    CheckOutHandler,
    SubmitReviewHandler,
  ],
})
export class BotModule {}

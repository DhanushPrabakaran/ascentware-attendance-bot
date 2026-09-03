import { Injectable, NotFoundException } from '@nestjs/common';
import { IActionHandler } from './interfaces/action-handler.interface';
import { CheckInHandler } from './handlers/checkin.handler';
import { ApplyLeaveHandler } from './handlers/apply-leave.handler';
import { SubmitLeaveHandler } from './handlers/submit-leave.handler';
import { EditPlanHandler } from './handlers/edit-plan.handler';
import { ApproveLeaveHandler } from './handlers/approve-leave.handler';
import { RejectLeaveHandler } from './handlers/reject-leave.handler';
import { CancelLeaveHandler } from './handlers/cancel-leave.handler';
import { CancelProcessHandler } from './handlers/cancel-process.handler';
import { CancelPlanTasksHandler } from './handlers/cancel-plan-tasks.handler';
import { SaveAllTasksHandler } from './handlers/save-all-tasks.handler';
import { StartBreakHandler } from './handlers/start-break.handler';
import { EndBreakHandler } from './handlers/end-break.handler';
import { CheckOutHandler } from './handlers/checkout.handler';
import { SubmitReviewHandler } from './handlers/submit-review.handler';
import * as workflowConfig from './workflow.config.json';

@Injectable()
export class WorkflowEngine {
  private handlers: Map<string, IActionHandler> = new Map();

  constructor(
    checkInHandler: CheckInHandler,
    applyLeaveHandler: ApplyLeaveHandler,
    submitLeaveHandler: SubmitLeaveHandler,
    editPlanHandler: EditPlanHandler,
    approveLeaveHandler: ApproveLeaveHandler,
    rejectLeaveHandler: RejectLeaveHandler,
    cancelLeaveHandler: CancelLeaveHandler,
    cancelProcessHandler: CancelProcessHandler,
    cancelPlanTasksHandler: CancelPlanTasksHandler,
    saveAllTasksHandler: SaveAllTasksHandler,
    startBreakHandler: StartBreakHandler,
    endBreakHandler: EndBreakHandler,
    checkOutHandler: CheckOutHandler,
    submitReviewHandler: SubmitReviewHandler,
  ) {
    this.handlers.set('CheckInHandler', checkInHandler);
    this.handlers.set('ApplyLeaveHandler', applyLeaveHandler);
    this.handlers.set('SubmitLeaveHandler', submitLeaveHandler);
    this.handlers.set('EditPlanHandler', editPlanHandler);
    this.handlers.set('ApproveLeaveHandler', approveLeaveHandler);
    this.handlers.set('RejectLeaveHandler', rejectLeaveHandler);
    this.handlers.set('CancelLeaveHandler', cancelLeaveHandler);
    this.handlers.set('CancelProcessHandler', cancelProcessHandler);
    this.handlers.set('CancelPlanTasksHandler', cancelPlanTasksHandler);
    this.handlers.set('SaveAllTasksHandler', saveAllTasksHandler);
    this.handlers.set('StartBreakHandler', startBreakHandler);
    this.handlers.set('EndBreakHandler', endBreakHandler);
    this.handlers.set('CheckOutHandler', checkOutHandler);
    this.handlers.set('SubmitReviewHandler', submitReviewHandler);
  }

  getHandlerForAction(actionName: string): IActionHandler {
    const config = (workflowConfig as any).actions[actionName];
    if (!config) {
      throw new NotFoundException(
        `No workflow configuration found for action: ${actionName}`,
      );
    }

    const handlerName = config.handler;
    const handler = this.handlers.get(handlerName);

    if (!handler) {
      throw new Error(
        `Handler ${handlerName} is not registered in the WorkflowEngine.`,
      );
    }

    return handler;
  }
}

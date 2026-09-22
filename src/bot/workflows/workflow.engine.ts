import { Injectable, NotFoundException } from '@nestjs/common';
import { IActionHandler } from './interfaces/action-handler.interface';
import {
  CheckInHandler,
  ApplyLeaveHandler,
  SubmitLeaveHandler,
  EditPlanHandler,
  ApproveLeaveHandler,
  RejectLeaveHandler,
  CancelLeaveHandler,
  CancelProcessHandler,
  CancelPlanTasksHandler,
  SaveAllTasksHandler,
  StartBreakHandler,
  EndBreakHandler,
  CheckOutHandler,
  SubmitReviewHandler,
} from './handlers';
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

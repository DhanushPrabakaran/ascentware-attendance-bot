import { CheckInHandler } from './checkin.handler';
import { ApplyLeaveHandler } from './apply-leave.handler';
import { SubmitLeaveHandler } from './submit-leave.handler';
import { EditPlanHandler } from './edit-plan.handler';
import { ApproveLeaveHandler } from './approve-leave.handler';
import { RejectLeaveHandler } from './reject-leave.handler';
import { CancelLeaveHandler } from './cancel-leave.handler';
import { CancelProcessHandler } from './cancel-process.handler';
import { CancelPlanTasksHandler } from './cancel-plan-tasks.handler';
import { SaveAllTasksHandler } from './save-all-tasks.handler';
import { StartBreakHandler } from './start-break.handler';
import { EndBreakHandler } from './end-break.handler';
import { CheckOutHandler } from './checkout.handler';
import { SubmitReviewHandler } from './submit-review.handler';

export const workflowHandlerProviders = [
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
];

export {
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
};

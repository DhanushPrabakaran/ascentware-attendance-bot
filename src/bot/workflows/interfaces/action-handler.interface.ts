import { TurnContext, Activity } from 'botbuilder';

export interface HandlerResult {
  activities?: Partial<Activity>[];
  deleteReplyToId?: boolean;
  markConsumed?: boolean;
  errorMessage?: string;
  setActivities?: { actionKey: string; activityId: string }[];
}

export interface IActionHandler {
  execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult>;
}

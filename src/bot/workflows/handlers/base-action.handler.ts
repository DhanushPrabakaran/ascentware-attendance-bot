import { Activity, Attachment, TurnContext } from 'botbuilder';
import {
  HandlerResult,
  IActionHandler,
} from '../interfaces/action-handler.interface';

/**
 * Nearly every concrete handler ends with the same shape: one or two adaptive-card
 * activities, delete the card that triggered the action, mark it consumed, and
 * optionally remember the ids of the next card's buttons. This collapses that
 * repeated tail into two small helpers so handlers only need to describe what's
 * different about them.
 */
export abstract class BaseActionHandler implements IActionHandler {
  abstract execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult>;

  protected cardActivity(card: Attachment): Partial<Activity> {
    return { type: 'message', attachments: [card] };
  }

  protected textActivity(text: string): Partial<Activity> {
    return { type: 'message', text };
  }

  protected respond(
    activities: Partial<Activity>[],
    opts: {
      setActivities?: { actionKey: string; activityId: string }[];
      deleteReplyToId?: boolean;
      markConsumed?: boolean;
    } = {},
  ): HandlerResult {
    return {
      activities,
      deleteReplyToId: opts.deleteReplyToId ?? true,
      markConsumed: opts.markConsumed ?? true,
      ...(opts.setActivities ? { setActivities: opts.setActivities } : {}),
    };
  }
}

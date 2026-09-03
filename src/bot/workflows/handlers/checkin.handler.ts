import { Injectable } from '@nestjs/common';
import { TurnContext } from 'botbuilder';
import {
  IActionHandler,
  HandlerResult,
} from '../interfaces/action-handler.interface';
import { BackendService } from '../../services/BackendService';
import { CardBuilder } from '../../cards/CardBuilder';
import { PlanTasksCard } from '../../cards/PlanTasksCard';

@Injectable()
export class CheckInHandler implements IActionHandler {
  async execute(
    context: TurnContext,
    value: any,
    replyToId?: string,
  ): Promise<HandlerResult> {
    const isLate = value.isLate === 'true';
    const reason = value.reason || '';

    const attendance = await BackendService.checkIn(context.activity.from.id);

    // Notify the general group chat
    try {
      const appId = process.env.CLIENT_ID || process.env.CLIENTID || process.env.MicrosoftAppId || '';
      const adapter = context.adapter as any;
      const employeeName = context.activity.from.name || 'An employee';
      const groupChatId = '19:adc81e9132dd45e6b3dfc769a8b4e2ad@thread.v2';
      
      const conversationReference = {
        bot: context.activity.recipient,
        conversation: {
          id: groupChatId,
          isGroup: true,
          conversationType: 'groupChat',
          tenantId: context.activity.conversation?.tenantId,
        },
        tenantId: context.activity.conversation?.tenantId,
        serviceUrl: context.activity.serviceUrl,
      };

      await adapter.continueConversationAsync(
        appId,
        conversationReference,
        async (tContext: TurnContext) => {
          await tContext.sendActivity(`✅ **${employeeName}** has just checked in for the day.`);
        }
      );
    } catch (err) {
      console.error('Failed to notify group chat:', err);
    }

    const attachment = PlanTasksCard.getCard(attendance.id);
    const result: HandlerResult = {
      activities: [
        {
          type: 'message',
          attachments: [attachment],
        },
      ],
      deleteReplyToId: true,
      markConsumed: true,
      setActivities: [
        { actionKey: attendance.id + '_saveAllTasks', activityId: '' },
        { actionKey: attendance.id + '_cancelPlanTasks', activityId: '' },
      ],
    };
    return result;
  }
}

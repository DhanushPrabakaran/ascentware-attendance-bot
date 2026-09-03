import { TurnContext, CloudAdapter } from 'botbuilder';
import { BackendService } from './services/BackendService';

export class BotHelper {
  static async notifyGroupChat(context: TurnContext, message: string) {
    try {
      const settings = await BackendService.getSettings();
      const groupChatId = settings?.commonGroupId || '19:adc81e9132dd45e6b3dfc769a8b4e2ad@thread.v2';
      
      const appId = process.env.CLIENT_ID || process.env.CLIENTID || process.env.MicrosoftAppId || '';
      const adapter = context.adapter as CloudAdapter;

      const conversationReference = {
        agent: context.activity.recipient || { id: `28:${appId}` },
        channelId: context.activity.channelId || 'msteams',
        conversation: {
          id: groupChatId,
          isGroup: true,
          conversationType: 'groupChat',
          tenantId: context.activity.conversation?.tenantId,
        },
        tenantId: context.activity.conversation?.tenantId,
        serviceUrl: context.activity.serviceUrl,
      };

      await adapter.continueConversation(
        conversationReference as any,
        async (tContext: TurnContext) => {
          await tContext.sendActivity(message);
        }
      );
    } catch (err: any) {
      console.error('Failed to notify group chat:', err);
      try {
        await context.sendActivity(`Failed to notify group chat: ${err.message || err.toString()}`);
      } catch (e) {}
    }
  }
}

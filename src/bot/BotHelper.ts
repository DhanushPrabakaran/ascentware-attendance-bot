import { TurnContext, CloudAdapter } from 'botbuilder';
import { BackendService } from './services/BackendService';
import axios from 'axios';

export class BotHelper {
  static async getRandomQuote(): Promise<string> {
    const quotes = [
      "No cap, you're gonna crush it today.",
      "Main character energy activated. Let's get this bread.",
      "Time to lock in and secure the bag.",
      "Big brain moves only today.",
      "You passed the vibe check. Have a great shift!",
      "Stay hydrated, stay focused, and pop off today.",
      "We're entering our productive era.",
      "Grind never stops, but don't forget to touch grass later.",
      "W work ethic. Let's go!",
      "Manifesting an easy, breezy workday for you."
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    return `_"${randomQuote}"_`;
  }

  static async notifyGroupChat(context: TurnContext, message: string) {
    try {
      const settings = await BackendService.getSettings();
      const groupChatId = settings?.commonGroupId || '19:adc81e9132dd45e6b3dfc769a8b4e2ad@thread.v2';
      
      const appId = process.env.CLIENT_ID || process.env.CLIENTID || process.env.MicrosoftAppId || '';
      const adapter = context.adapter as CloudAdapter;

      const reference = TurnContext.getConversationReference(context.activity);
      
      // Override the conversation ID to point to the group chat
      reference.conversation = {
        id: groupChatId,
        isGroup: true,
        conversationType: 'groupChat',
        tenantId: context.activity.conversation?.tenantId
      } as any;
      
      // Delete user so we aren't targeting the individual user's thread
      delete reference.user;

      await adapter.continueConversation(
        appId,
        reference as any,
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

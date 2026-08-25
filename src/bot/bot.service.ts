import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    createBotFrameworkAuthenticationFromConfiguration
} from 'botbuilder';
import { TeamsAttendanceBot } from './TeamsAttendanceBot';

@Injectable()
export class BotService {
  private adapter: CloudAdapter;
  private myBot: TeamsAttendanceBot;

  constructor() {
    const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
        MicrosoftAppId: process.env.MicrosoftAppId,
        MicrosoftAppPassword: process.env.MicrosoftAppPassword,
        MicrosoftAppType: process.env.MicrosoftAppType,
        MicrosoftAppTenantId: process.env.MicrosoftAppTenantId
    });

    const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);
    this.adapter = new CloudAdapter(botFrameworkAuthentication);
    
    this.adapter.onTurnError = async (context, error) => {
        console.error(`\n [onTurnError] unhandled error: ${error}`);
        await context.sendTraceActivity(
            'OnTurnError Trace',
            `${error}`,
            'https://www.botframework.com/schemas/error',
            'TurnError'
        );
        await context.sendActivity('The bot encountered an error or bug.');
    };

    this.myBot = new TeamsAttendanceBot();
  }

  async process(req: Request, res: Response) {
    await this.adapter.process(req, res, (context) => this.myBot.run(context));
  }
}

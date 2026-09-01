import { Injectable } from '@nestjs/common';
import type { RequestHandler } from 'express';
import {
  AgentApplication,
  MemoryStorage,
  TurnState,
  CloudAdapter,
} from '@microsoft/agents-hosting';
import { createAgentRequestHandler } from '@microsoft/agents-hosting-express';
import { TeamsAttendanceBot } from './TeamsAttendanceBot';

@Injectable()
export class BotService {
  private app: AgentApplication<TurnState>;
  private myBot: TeamsAttendanceBot;
  public handler: RequestHandler;

  constructor() {
    const storage = new MemoryStorage();

    // The new SDK strict parser looks for 'CLIENTID' without underscore, so we manually
    // pass the correct credentials into the CloudAdapter to ensure it works on Render.
    const authConfig: any = {
      clientId:
        process.env.CLIENT_ID ||
        process.env.CLIENTID ||
        process.env.MicrosoftAppId,
      clientSecret:
        process.env.CLIENT_SECRET ||
        process.env.CLIENTSECRET ||
        process.env.MicrosoftAppPassword,
    };

    const configuredTenant =
      process.env.MicrosoftAppTenantId || process.env.TENANT_ID;
    if (configuredTenant) {
      authConfig.tenantId = configuredTenant;
    }

    const adapter = new CloudAdapter(authConfig);

    this.app = new AgentApplication<TurnState>({ storage, adapter });

    this.myBot = new TeamsAttendanceBot();
    this.myBot.registerHandlers(this.app);

    this.handler = createAgentRequestHandler(this.app, authConfig);
  }
}

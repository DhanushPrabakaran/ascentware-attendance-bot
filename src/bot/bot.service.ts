import { Injectable } from '@nestjs/common';
import type { RequestHandler } from 'express';
import { AgentApplication, MemoryStorage, TurnState } from '@microsoft/agents-hosting';
import { createAgentRequestHandler } from '@microsoft/agents-hosting-express';
import { TeamsAttendanceBot } from './TeamsAttendanceBot';

@Injectable()
export class BotService {
  private app: AgentApplication<TurnState>;
  private myBot: TeamsAttendanceBot;
  public handler: RequestHandler;

  constructor() {
    const storage = new MemoryStorage();
    this.app = new AgentApplication<TurnState>({ storage });
    
    this.myBot = new TeamsAttendanceBot();
    this.myBot.registerHandlers(this.app);

    this.handler = createAgentRequestHandler(this.app);
  }
}

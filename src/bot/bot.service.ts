import { Injectable } from '@nestjs/common';
import type { RequestHandler } from 'express';
import type { Activity } from 'botbuilder';
import {
  AgentApplication,
  MemoryStorage,
  TurnState,
  CloudAdapter,
} from '@microsoft/agents-hosting';
import { createAgentRequestHandler } from '@microsoft/agents-hosting-express';
import { Logger } from 'nestjs-pino';
import { TeamsAttendanceBot } from './TeamsAttendanceBot';
import { WorkflowEngine } from './workflows/workflow.engine';
import { ActivityTrackerService } from './services/activity-tracker.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AdminService } from '../admin/admin.service';
import { BotHelper } from './BotHelper';
import { GroupsService } from '../groups/groups.service';

const DEFAULT_TEAMS_SERVICE_URL = 'https://smba.trafficmanager.net/teams/';

@Injectable()
export class BotService {
  private app: AgentApplication<TurnState>;
  private adapter: CloudAdapter;
  private myBot: TeamsAttendanceBot;
  public handler: RequestHandler;

  constructor(
    private workflowEngine: WorkflowEngine,
    private activityTracker: ActivityTrackerService,
    private attendanceService: AttendanceService,
    private adminService: AdminService,
    private logger: Logger,
    private botHelper: BotHelper,
    private groupsService: GroupsService,
  ) {
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
    this.adapter = adapter;

    this.app = new AgentApplication<TurnState>({ storage, adapter });

    this.myBot = new TeamsAttendanceBot(
      this.workflowEngine,
      this.activityTracker,
      this.attendanceService,
      this.adminService,
      this.logger,
      this.botHelper,
      this.groupsService,
    );
    this.myBot.registerHandlers(this.app);

    this.handler = createAgentRequestHandler(this.app, authConfig);
  }

  /**
   * Proactively posts a message into a Teams conversation outside of a bot turn - the
   * Groups screen's "send test message", reminders and digests. A personal conversation
   * is the bot's 1:1 chat with someone (Employee.teamsConversationId). Needs the Teams
   * service URL, which AdminService.rememberBotEndpoint captures from incoming
   * activities; before the bot has received any, the global Teams endpoint is used.
   * Throws if Teams rejects the send (bot not in the chat, wrong ID, ...) so the caller
   * can surface it.
   */
  async sendToConversation(
    conversationId: string,
    message: string | Partial<Activity>,
    opts: { personal?: boolean } = {},
  ) {
    const appId =
      process.env.CLIENT_ID ||
      process.env.CLIENTID ||
      process.env.MicrosoftAppId ||
      '';
    if (!appId) {
      throw new Error('Bot credentials (CLIENT_ID) are not configured');
    }
    const endpoint = await this.adminService.getBotEndpoint();
    const botAccount = { id: `28:${appId}` };
    const reference: any = {
      channelId: 'msteams',
      serviceUrl: endpoint.serviceUrl || DEFAULT_TEAMS_SERVICE_URL,
      // @microsoft/agents-activity reads 'agent' instead of 'bot' for continuation activities
      bot: botAccount,
      agent: botAccount,
      conversation: {
        id: conversationId,
        isGroup: !opts.personal,
        conversationType: opts.personal ? 'personal' : 'groupChat',
        tenantId: endpoint.tenantId || undefined,
      },
    };

    await this.adapter.continueConversation(
      appId,
      reference,
      async (context) => {
        await context.sendActivity(message as any);
      },
    );
  }
}

import { mockDeep } from 'jest-mock-extended';
import { Logger } from 'nestjs-pino';
import { BotHelper } from './BotHelper';
import { AdminService } from '../admin/admin.service';
import { GroupsService } from '../groups/groups.service';

describe('BotHelper.notifyGroupChat', () => {
  const sent: { conversationId: string; payload: any }[] = [];
  let groupsService: ReturnType<typeof mockDeep<GroupsService>>;
  let helper: BotHelper;
  let context: any;

  beforeEach(() => {
    sent.length = 0;
    process.env.CLIENT_ID = 'app-id';
    groupsService = mockDeep<GroupsService>();
    helper = new BotHelper(
      mockDeep<AdminService>(),
      groupsService,
      mockDeep<Logger>(),
    );
    const adapter = {
      continueConversation: jest.fn(
        async (_appId: string, reference: any, logic: any) => {
          await logic({
            sendActivity: (payload: any) => {
              sent.push({ conversationId: reference.conversation.id, payload });
              return Promise.resolve();
            },
          });
        },
      ),
    };
    context = {
      adapter,
      activity: {
        type: 'message',
        from: { id: '29:jane' },
        recipient: { id: '28:bot' },
        conversation: { id: 'dm-1', tenantId: 't1' },
        serviceUrl: 'https://smba.example/',
        channelId: 'msteams',
      },
      sendActivity: jest.fn(),
    };
  });

  afterEach(() => {
    delete process.env.CLIENT_ID;
  });

  it("sends a card activity to each of the sender's groups", async () => {
    groupsService.getTargetsForEmployee.mockResolvedValue(['g1', 'g2']);
    const card = { type: 'message', attachments: [{ contentType: 'x' }] };

    await helper.notifyGroupChat(context, card);

    expect(groupsService.getTargetsForEmployee).toHaveBeenCalledWith({
      teamsUserId: '29:jane',
    });
    expect(sent).toEqual([
      { conversationId: 'g1', payload: card },
      { conversationId: 'g2', payload: card },
    ]);
    expect(context.sendActivity).not.toHaveBeenCalled();
  });

  it('keeps going when one group fails and tells the user which failed', async () => {
    groupsService.getTargetsForEmployee.mockResolvedValue(['bad', 'g2']);
    context.adapter.continueConversation.mockImplementationOnce(() =>
      Promise.reject(new Error('Forbidden')),
    );

    await helper.notifyGroupChat(context, 'hello');

    expect(sent).toEqual([{ conversationId: 'g2', payload: 'hello' }]);
    expect(context.sendActivity).toHaveBeenCalledWith(
      expect.stringContaining('bad'),
    );
  });

  it('does nothing when the employee has no target groups', async () => {
    groupsService.getTargetsForEmployee.mockResolvedValue([]);
    await helper.notifyGroupChat(context, 'hello');
    expect(context.adapter.continueConversation).not.toHaveBeenCalled();
  });
});

import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Prisma, PrismaClient } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { SchedulerService } from './scheduler.service';
import { TeamDayService } from './team-day.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminService } from '../../admin/admin.service';
import { GroupsService } from '../../groups/groups.service';
import { BotService } from '../bot.service';

// The real BotService pulls in the Teams SDK (ESM-only deps Jest can't load); every
// test uses a mock of it anyway.
jest.mock('../bot.service', () => ({ BotService: class {} }));

/** IST wall clock on Mon 5 Oct 2026 as a UTC instant. */
const ist = (clock: string) => {
  const [h, m] = clock.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, 5, h, m) - 330 * 60000);
};

const employee = (overrides: any = {}) => ({
  id: 'e1',
  name: 'Jane',
  teamsConversationId: 'dm-jane',
  shift: null,
  ...overrides,
});

describe('SchedulerService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let groups: DeepMockProxy<GroupsService>;
  let bot: DeepMockProxy<BotService>;
  let teamDay: DeepMockProxy<TeamDayService>;
  let scheduler: SchedulerService;
  let claimed: Set<string>;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    groups = mockDeep<GroupsService>();
    bot = mockDeep<BotService>();
    teamDay = mockDeep<TeamDayService>();
    scheduler = new SchedulerService(
      prisma as unknown as PrismaService,
      mockDeep<AdminService>(),
      groups,
      bot,
      teamDay,
      mockDeep<Logger>(),
    );

    claimed = new Set();
    prisma.scheduledSend.create.mockImplementation((args: any) => {
      if (claimed.has(args.data.key)) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError('dup', {
            code: 'P2002',
            clientVersion: 'x',
          }),
        ) as any;
      }
      claimed.add(args.data.key);
      return Promise.resolve({}) as any;
    });
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.leave.findMany.mockResolvedValue([]);
  });

  describe('check-in reminders', () => {
    it('reminds once, at the default time, only people not checked in', async () => {
      prisma.employee.findMany.mockResolvedValue([
        employee(),
        employee({ id: 'e2', name: 'Raj', teamsConversationId: 'dm-raj' }),
      ] as any);
      prisma.attendance.findMany.mockResolvedValue([
        { employeeId: 'e2' },
      ] as any);

      await scheduler.sendCheckInReminders(ist('09:59'), '10:00');
      expect(bot.sendToConversation).not.toHaveBeenCalled();

      await scheduler.sendCheckInReminders(ist('10:02'), '10:00');
      await scheduler.sendCheckInReminders(ist('10:07'), '10:00');

      expect(bot.sendToConversation).toHaveBeenCalledTimes(1);
      expect(bot.sendToConversation).toHaveBeenCalledWith(
        'dm-jane',
        expect.objectContaining({ attachments: expect.any(Array) }),
        { personal: true },
      );
      expect(claimed).toContain('checkin:e1:2026-10-05');
    });

    it('uses shift start + 30 min, and skips stale or on-leave reminders', async () => {
      prisma.employee.findMany.mockResolvedValue([
        employee({ shift: { startTime: '09:00', endTime: '18:00' } }),
      ] as any);

      await scheduler.sendCheckInReminders(ist('09:20'), '10:00');
      expect(bot.sendToConversation).not.toHaveBeenCalled();

      // More than 3 hours late (server asleep) - skipped rather than sent stale.
      await scheduler.sendCheckInReminders(ist('13:00'), '10:00');
      expect(bot.sendToConversation).not.toHaveBeenCalled();

      prisma.leave.findMany.mockResolvedValue([
        { employeeId: 'e1', startTime: null, endTime: null },
      ] as any);
      await scheduler.sendCheckInReminders(ist('09:31'), '10:00');
      expect(bot.sendToConversation).not.toHaveBeenCalled();

      prisma.leave.findMany.mockResolvedValue([
        { employeeId: 'e1', startTime: '13:00', endTime: '15:00' },
      ] as any);
      await scheduler.sendCheckInReminders(ist('09:31'), '10:00');
      expect(bot.sendToConversation).toHaveBeenCalledTimes(1);
    });
  });

  describe('check-out reminders', () => {
    const open = (overrides: any = {}) => ({
      id: 'att-1',
      status: 'checked_in',
      checkIn: ist('09:00'),
      employee: employee(),
      ...overrides,
    });

    it('reminds after the default time, but not someone who only just checked in', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        open(),
        open({
          id: 'att-2',
          checkIn: ist('17:00'),
          employee: employee({ id: 'e2', teamsConversationId: 'dm-raj' }),
        }),
      ] as any);

      await scheduler.sendCheckOutReminders(ist('18:59'), '19:00');
      expect(bot.sendToConversation).not.toHaveBeenCalled();

      await scheduler.sendCheckOutReminders(ist('19:05'), '19:00');
      expect(bot.sendToConversation).toHaveBeenCalledTimes(1);
      expect(bot.sendToConversation).toHaveBeenCalledWith(
        'dm-jane',
        expect.anything(),
        { personal: true },
      );

      // 4 hours after the late check-in.
      await scheduler.sendCheckOutReminders(ist('21:01'), '19:00');
      expect(bot.sendToConversation).toHaveBeenCalledTimes(2);
      expect(bot.sendToConversation).toHaveBeenLastCalledWith(
        'dm-raj',
        expect.anything(),
        { personal: true },
      );
    });

    it('uses shift end + 30 min', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        open({
          employee: employee({
            shift: { startTime: '08:00', endTime: '17:00' },
          }),
          checkIn: ist('08:00'),
        }),
      ] as any);
      await scheduler.sendCheckOutReminders(ist('17:25'), '19:00');
      expect(bot.sendToConversation).not.toHaveBeenCalled();
      await scheduler.sendCheckOutReminders(ist('17:31'), '19:00');
      expect(bot.sendToConversation).toHaveBeenCalledTimes(1);
    });
  });

  describe('digests', () => {
    it('posts the morning digest once per group with members', async () => {
      groups.getActiveGroupsWithMembers.mockResolvedValue([
        {
          id: 'g1',
          name: 'Dev',
          conversationId: 'conv-dev',
          members: [{ id: 'e1', name: 'Jane' }],
        },
        { id: 'g2', name: 'Empty', conversationId: 'conv-empty', members: [] },
      ]);
      teamDay.getMemberDays.mockResolvedValue([
        {
          name: 'Jane',
          state: 'absent',
          tasksTotal: 0,
          tasksDone: 0,
          blocked: [],
        },
      ]);

      await scheduler.sendDigests(ist('10:31'), '10:30', '20:00');
      await scheduler.sendDigests(ist('10:36'), '10:30', '20:00');

      expect(bot.sendToConversation).toHaveBeenCalledTimes(1);
      expect(bot.sendToConversation).toHaveBeenCalledWith(
        'conv-dev',
        expect.objectContaining({ attachments: expect.any(Array) }),
        { personal: false },
      );

      await scheduler.sendDigests(ist('20:01'), '10:30', '20:00');
      expect(bot.sendToConversation).toHaveBeenCalledTimes(2);
      expect(claimed).toContain('digest-pm:g1:2026-10-05');
    });
  });

  describe('auto check-out notices', () => {
    it('waits until morning, then sends each notice once', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        {
          id: 'att-9',
          checkIn: ist('09:00'),
          checkOut: ist('18:00'),
          workingMinutes: 540,
          employee: employee(),
        },
      ] as any);

      await scheduler.sendAutoCheckOutNotices(ist('07:00'));
      expect(bot.sendToConversation).not.toHaveBeenCalled();

      await scheduler.sendAutoCheckOutNotices(ist('08:05'));
      await scheduler.sendAutoCheckOutNotices(ist('08:10'));
      expect(bot.sendToConversation).toHaveBeenCalledTimes(1);
      expect(claimed).toContain('autoclose:att-9');
    });
  });

  it('a failed send is logged, not thrown', async () => {
    prisma.employee.findMany.mockResolvedValue([employee()] as any);
    bot.sendToConversation.mockRejectedValue(new Error('Forbidden'));
    await expect(
      scheduler.sendCheckInReminders(ist('10:01'), '10:00'),
    ).resolves.toBeUndefined();
  });
});

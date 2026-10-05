import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { TeamDayService } from './team-day.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DigestCard } from '../cards/DigestCard';

describe('TeamDayService + DigestCard', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: TeamDayService;
  const now = new Date('2026-10-05T05:00:00Z'); // 10:30 IST

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new TeamDayService(prisma as unknown as PrismaService);
  });

  it("summarises each member's day", async () => {
    prisma.attendance.findMany.mockResolvedValue([
      {
        employeeId: 'e1',
        status: 'checked_in',
        checkIn: new Date('2026-10-05T03:42:00Z'),
        checkOut: null,
        autoCheckedOut: false,
        dailyTasks: [
          { taskName: 'Fix login', status: 'completed' },
          { taskName: 'Deploy', status: 'blocked' },
        ],
      },
    ] as any);
    prisma.leave.findMany.mockResolvedValue([
      {
        employeeId: 'e2',
        leaveType: 'Sick',
        startTime: null,
        endTime: null,
        durationMinutes: null,
      },
      {
        employeeId: 'e3',
        leaveType: 'Permission',
        startTime: '14:00',
        endTime: '16:00',
        durationMinutes: 120,
      },
    ] as any);

    const days = await service.getMemberDays(
      [
        { id: 'e1', name: 'Jane' },
        { id: 'e2', name: 'Raj' },
        { id: 'e3', name: 'Ana' },
      ],
      now,
    );

    expect(days).toEqual([
      expect.objectContaining({
        name: 'Jane',
        state: 'working',
        checkIn: '09:12',
        tasksTotal: 2,
        tasksDone: 1,
        blocked: ['Deploy'],
      }),
      expect.objectContaining({
        name: 'Raj',
        state: 'on_leave',
        leave: 'Sick leave',
      }),
      expect.objectContaining({
        name: 'Ana',
        state: 'absent',
        leave: 'Permission 14:00–16:00',
      }),
    ]);

    const morning = JSON.stringify(DigestCard.morning('Mon, 5 Oct', days));
    expect(morning).toContain('✅ In since 09:12');
    expect(morning).toContain('🌴 Sick leave');
    expect(morning).toContain('— Not checked in · 🌴 Permission 14:00–16:00');
    expect(morning).toContain('"1 of 3"');

    const evening = JSON.stringify(DigestCard.evening('Mon, 5 Oct', days));
    expect(evening).toContain('"1/2"');
    expect(evening).toContain('Deploy');
  });
});

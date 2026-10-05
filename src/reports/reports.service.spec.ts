import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

const manager = {
  sub: 'm1',
  email: 'm@x.com',
  role: Role.EMPLOYEE,
  isManager: true,
} as JwtPayload;

describe('ReportsService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let admin: DeepMockProxy<AdminService>;
  let service: ReportsService;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    admin = mockDeep<AdminService>();
    service = new ReportsService(prisma as unknown as PrismaService, admin);
    admin.getVisibleEmployeeIds.mockResolvedValue(['m1', 'e1']);
    admin.getAllReports.mockResolvedValue([]);
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.leave.findMany.mockResolvedValue([]);
  });

  it("refuses a person outside the requester's reporting chain", async () => {
    await expect(
      service.getEmployeeReport(
        manager,
        'stranger',
        '2026-10-01',
        '2026-10-05',
      ),
    ).rejects.toThrow("cannot view this employee's work");
    expect(prisma.employee.findMany).not.toHaveBeenCalled();
  });

  it('only loads visible, active employees for the day view', async () => {
    prisma.employee.findMany.mockResolvedValue([
      { id: 'e1', name: 'Jane', shift: null } as any,
    ]);
    const day = await service.getDay(manager, '2026-10-05');
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, id: { in: ['m1', 'e1'] } },
      }),
    );
    expect(day.people).toHaveLength(1);
    expect(day.totals.absent).toBe(1);
  });

  it('caps the period length', async () => {
    await expect(
      service.getPeople(manager, '2026-01-01', '2026-10-05'),
    ).rejects.toThrow('at most 92 days');
  });

  it('only offers leave decisions for direct/indirect reports', async () => {
    prisma.employee.findMany.mockResolvedValue([
      { id: 'm1', name: 'Me', shift: null },
      { id: 'e1', name: 'Jane', shift: null },
    ] as any);
    admin.getAllReports.mockResolvedValue([{ id: 'e1' }] as any);
    prisma.leave.findMany.mockResolvedValue([]);
    await service.getAttention(manager);
    expect(prisma.leave.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING', employeeId: { in: ['e1'] } },
      }),
    );
  });

  describe('editTask', () => {
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);
    const task = (employeeId: string, checkIn: Date) => ({
      id: 't1',
      status: 'not_started',
      timeTakenMinutes: 0,
      remarks: null,
      attendance: { employeeId, checkIn },
    });
    const me = {
      sub: 'e1',
      email: 'e1@x.com',
      role: Role.EMPLOYEE,
      isManager: false,
    } as JwtPayload;

    beforeEach(() => {
      admin.getAllReports.mockResolvedValue([]);
      prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
      prisma.dailyTask.update.mockResolvedValue({
        id: 't1',
        taskName: 'x',
        priority: 'normal',
        estimatedMinutes: 60,
        timeTakenMinutes: 45,
        status: 'completed',
        remarks: 'done late',
        carriedFrom: null,
        carriedInto: [],
        edits: [],
      } as any);
    });

    it('lets people fix their own recent tasks and records what changed', async () => {
      prisma.dailyTask.findUnique.mockResolvedValue(
        task('e1', daysAgo(1)) as any,
      );
      await service.editTask(me, 't1', {
        status: 'completed',
        timeTakenMinutes: 45,
        remarks: 'done late',
      });
      expect(prisma.taskEdit.create).toHaveBeenCalledWith({
        data: {
          taskId: 't1',
          editedById: 'e1',
          changes: {
            status: ['not_started', 'completed'],
            timeTakenMinutes: [0, 45],
            remarks: [null, 'done late'],
          },
        },
      });
    });

    it('sends older own tasks to the manager, who can edit any day', async () => {
      prisma.dailyTask.findUnique.mockResolvedValue(
        task('e1', daysAgo(10)) as any,
      );
      await expect(
        service.editTask(me, 't1', { status: 'completed' }),
      ).rejects.toThrow('only be updated by your manager');

      admin.getAllReports.mockResolvedValue([{ id: 'e1' }] as any);
      await service.editTask(manager, 't1', { status: 'completed' });
      expect(prisma.taskEdit.create).toHaveBeenCalledTimes(1);
    });

    it("refuses other people's tasks and empty edits", async () => {
      prisma.dailyTask.findUnique.mockResolvedValue(
        task('e2', daysAgo(0)) as any,
      );
      await expect(
        service.editTask(me, 't1', { status: 'completed' }),
      ).rejects.toThrow("cannot update this person's tasks");

      prisma.dailyTask.findUnique.mockResolvedValue(
        task('e1', daysAgo(0)) as any,
      );
      await expect(
        service.editTask(me, 't1', { status: 'not_started' }),
      ).rejects.toThrow('Nothing changed');
      expect(prisma.taskEdit.create).not.toHaveBeenCalled();
    });
  });
});

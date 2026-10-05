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
});

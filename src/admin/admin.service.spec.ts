import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, Role, Employee } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function emp(overrides: Partial<Employee>): Employee {
  return {
    id: overrides.id ?? 'id',
    name: 'Name',
    email: 'name@x.com',
    teamsUserId: null,
    role: Role.EMPLOYEE,
    managerEmails: [],
    hrEmail: null,
    passwordHash: null,
    isActive: true,
    deactivatedAt: null,
    isProvisional: false,
    shiftId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AdminService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: AdminService;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    const notifications = mockDeep<NotificationsService>();
    service = new AdminService(
      prisma as unknown as PrismaService,
      notifications,
    );
  });

  describe('getAllReports', () => {
    it('walks a linear chain to find indirect reports', async () => {
      const manager = emp({ id: 'b', email: 'b@x.com' });
      const employee = emp({
        id: 'c',
        email: 'c@x.com',
        managerEmails: ['b@x.com'],
      });

      prisma.employee.findMany
        .mockResolvedValueOnce([manager]) // hasSome: [a@x.com]
        .mockResolvedValueOnce([employee]) // hasSome: [b@x.com]
        .mockResolvedValueOnce([]); // hasSome: [c@x.com]

      const result = await service.getAllReports('a@x.com');

      expect(result.map((e) => e.id)).toEqual(['b', 'c']);
    });

    it('dedupes an employee reachable through two different managers', async () => {
      const b = emp({ id: 'b', email: 'b@x.com', managerEmails: ['a@x.com'] });
      // x reports to both the root (a) and to b - discoverable again at the next level.
      const x = emp({
        id: 'x',
        email: 'x@x.com',
        managerEmails: ['a@x.com', 'b@x.com'],
      });

      prisma.employee.findMany
        .mockResolvedValueOnce([b, x]) // hasSome: [a@x.com] -> both report to a directly
        .mockResolvedValueOnce([x]) // hasSome: [b@x.com, x@x.com] -> x shows up again
        .mockResolvedValueOnce([]);

      const result = await service.getAllReports('a@x.com');

      expect(result.map((e) => e.id).sort()).toEqual(['b', 'x']);
    });

    it('does not loop forever or count the root as its own report on cyclic data', async () => {
      // Bad data: a reports to b, and b (incorrectly) reports back to a.
      const b = emp({ id: 'b', email: 'b@x.com', managerEmails: ['a@x.com'] });
      const a = emp({ id: 'a', email: 'a@x.com', managerEmails: ['b@x.com'] });

      prisma.employee.findMany
        .mockResolvedValueOnce([b]) // hasSome: [a@x.com]
        .mockResolvedValueOnce([a]); // hasSome: [b@x.com] - cycles back to the root

      const result = await service.getAllReports('a@x.com');

      expect(result.map((e) => e.id)).toEqual(['b']);
      expect(prisma.employee.findMany).toHaveBeenCalledTimes(2); // stopped, didn't keep looping
    });

    it('returns an empty list for someone with no reports', async () => {
      prisma.employee.findMany.mockResolvedValueOnce([]);
      const result = await service.getAllReports('nobody@x.com');
      expect(result).toEqual([]);
    });
  });

  describe('isManagerOf', () => {
    it('is true for a direct report', async () => {
      prisma.employee.findMany
        .mockResolvedValueOnce([emp({ id: 'report-1' })])
        .mockResolvedValueOnce([]);
      await expect(service.isManagerOf('m@x.com', 'report-1')).resolves.toBe(
        true,
      );
    });

    it('is false for someone outside the reporting chain', async () => {
      prisma.employee.findMany.mockResolvedValueOnce([]);
      await expect(service.isManagerOf('m@x.com', 'stranger')).resolves.toBe(
        false,
      );
    });
  });

  describe('getVisibleEmployeeIds', () => {
    const base: JwtPayload = {
      sub: 'me',
      email: 'me@x.com',
      name: 'Me',
      role: Role.EMPLOYEE,
      isManager: false,
    };

    it("ADMIN sees 'ALL'", async () => {
      const result = await service.getVisibleEmployeeIds({
        ...base,
        role: Role.ADMIN,
      });
      expect(result).toBe('ALL');
    });

    it('EMPLOYEE sees only self when they have no reports', async () => {
      prisma.employee.findMany.mockResolvedValueOnce([]);
      const result = await service.getVisibleEmployeeIds(base);
      expect(result).toEqual(['me']);
    });

    it('a manager sees self plus reports', async () => {
      prisma.employee.findMany
        .mockResolvedValueOnce([emp({ id: 'report-1' })])
        .mockResolvedValueOnce([]);
      const result = await service.getVisibleEmployeeIds(base);
      expect(result).toEqual(expect.arrayContaining(['me', 'report-1']));
    });

    it('HR sees self, reports, and hr-assigned employees', async () => {
      prisma.employee.findMany
        .mockResolvedValueOnce([]) // getAllReports
        .mockResolvedValueOnce([emp({ id: 'assigned-1' })]); // getHrAssignedEmployees

      const result = await service.getVisibleEmployeeIds({
        ...base,
        role: Role.HR,
      });
      expect(result).toEqual(expect.arrayContaining(['me', 'assigned-1']));
    });
  });

  describe('canManageLeave', () => {
    const base: JwtPayload = {
      sub: 'manager-id',
      email: 'manager@x.com',
      name: 'Manager',
      role: Role.EMPLOYEE,
      isManager: true,
    };

    it("allows a manager to manage their report's leave", async () => {
      prisma.employee.findMany
        .mockResolvedValueOnce([emp({ id: 'report-1' })])
        .mockResolvedValueOnce([]);
      await expect(
        service.canManageLeave(base, { employeeId: 'report-1' }),
      ).resolves.toBe(true);
    });

    it('does not allow HR to manage leave - HR only watches', async () => {
      prisma.employee.findMany.mockResolvedValueOnce([]); // not in the manager chain
      const hr: JwtPayload = { ...base, role: Role.HR, email: 'hr@x.com' };
      await expect(
        service.canManageLeave(hr, { employeeId: 'report-1' }),
      ).resolves.toBe(false);
    });

    it('always allows ADMIN', async () => {
      const admin: JwtPayload = { ...base, role: Role.ADMIN };
      await expect(
        service.canManageLeave(admin, { employeeId: 'anyone' }),
      ).resolves.toBe(true);
    });
  });
});

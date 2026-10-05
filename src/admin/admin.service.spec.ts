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
    teamsConversationId: null,
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

  describe('createLeaveForEmployee (leave in hours)', () => {
    const day = new Date('2026-10-06T00:00:00Z');
    const base = {
      leaveType: 'Permission',
      startDate: day,
      endDate: day,
      reason: 'Doctor',
    };

    beforeEach(() => {
      prisma.leave.create.mockImplementation((args: any) => ({
        ...args.data,
        id: 'l1',
        employee: emp({ id: 'e1' }),
      }));
      prisma.employee.findUnique.mockResolvedValue(null);
      prisma.leave.findMany.mockResolvedValue([]);
    });

    it('stores times and duration, and pins endDate to startDate', async () => {
      await service.createLeaveForEmployee('e1', {
        ...base,
        endDate: new Date('2026-10-09T00:00:00Z'),
        startTime: '10:00',
        endTime: '14:00',
      });
      expect(prisma.leave.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startTime: '10:00',
            endTime: '14:00',
            durationMinutes: 240,
            endDate: day,
          }),
        }),
      );
    });

    it('full-day leave stores no times', async () => {
      await service.createLeaveForEmployee('e1', base);
      expect(prisma.leave.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startTime: null,
            endTime: null,
            durationMinutes: null,
          }),
        }),
      );
    });

    it.each([
      [{ startTime: '10:00' }, 'both the From and To'],
      [{ startTime: '14:00', endTime: '10:00' }, 'after From time'],
      [{ startTime: '10:00', endTime: '10:00' }, 'after From time'],
      [{ startTime: '9am', endTime: '10:00' }, 'HH:mm'],
    ])('rejects %j', async (times, message) => {
      await expect(
        service.createLeaveForEmployee('e1', { ...base, ...times }),
      ).rejects.toThrow(message);
      expect(prisma.leave.create).not.toHaveBeenCalled();
    });

    it('rejects a full-day range that ends before it starts', async () => {
      await expect(
        service.createLeaveForEmployee('e1', {
          ...base,
          endDate: new Date('2026-10-01T00:00:00Z'),
        }),
      ).rejects.toThrow('End date must be on or after start date');
    });

    it('rejects a request overlapping a full-day leave', async () => {
      prisma.leave.findMany.mockResolvedValue([
        {
          ...base,
          leaveType: 'Sick',
          status: 'APPROVED',
          startTime: null,
          endTime: null,
          durationMinutes: null,
        },
      ] as any);
      await expect(
        service.createLeaveForEmployee('e1', {
          ...base,
          startTime: '10:00',
          endTime: '11:00',
        }),
      ).rejects.toThrow('overlaps your approved Sick leave');
      expect(prisma.leave.create).not.toHaveBeenCalled();
    });

    it('allows two hourly leaves on the same day when the times do not intersect', async () => {
      const existing = {
        ...base,
        status: 'PENDING',
        startTime: '10:00',
        endTime: '12:00',
        durationMinutes: 120,
      };
      prisma.leave.findMany.mockResolvedValue([existing] as any);

      await service.createLeaveForEmployee('e1', {
        ...base,
        startTime: '12:00',
        endTime: '13:00',
      });
      expect(prisma.leave.create).toHaveBeenCalled();

      await expect(
        service.createLeaveForEmployee('e1', {
          ...base,
          startTime: '11:00',
          endTime: '13:00',
        }),
      ).rejects.toThrow('overlaps your pending Permission leave');
    });
  });

  describe('cancelLeave', () => {
    const me: JwtPayload = {
      sub: 'e1',
      email: 'name@x.com',
      role: Role.EMPLOYEE,
    } as JwtPayload;
    const leave = (overrides: any) => ({
      id: 'l1',
      employeeId: 'e1',
      leaveType: 'Sick',
      status: 'PENDING',
      startDate: new Date('2099-01-05T00:00:00Z'),
      endDate: new Date('2099-01-05T00:00:00Z'),
      employee: emp({ id: 'e1', hrEmail: null }),
      ...overrides,
    });

    beforeEach(() => {
      prisma.leave.update.mockResolvedValue({} as any);
      prisma.employee.findUnique.mockResolvedValue(emp({ id: 'e1' }));
      prisma.employee.findMany.mockResolvedValue([]);
    });

    it("cancels the employee's own pending leave", async () => {
      prisma.leave.findUnique.mockResolvedValue(leave({}));
      await service.cancelLeave('l1', me);
      expect(prisma.leave.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });

    it("refuses someone else's leave, a decided one, or an approved one already started", async () => {
      prisma.leave.findUnique.mockResolvedValue(leave({ employeeId: 'other' }));
      await expect(service.cancelLeave('l1', me)).rejects.toThrow(
        'only cancel your own',
      );

      prisma.leave.findUnique.mockResolvedValue(leave({ status: 'REJECTED' }));
      await expect(service.cancelLeave('l1', me)).rejects.toThrow(
        'already rejected',
      );

      prisma.leave.findUnique.mockResolvedValue(
        leave({
          status: 'APPROVED',
          startDate: new Date('2020-01-01T00:00:00Z'),
        }),
      );
      await expect(service.cancelLeave('l1', me)).rejects.toThrow(
        'only be cancelled by an admin',
      );
      expect(prisma.leave.update).not.toHaveBeenCalled();
    });
  });

  describe('getLeaveBalance', () => {
    it('counts working days of full-day leave and hours of hourly leave separately', async () => {
      prisma.settings.findUnique.mockResolvedValue({
        id: 'default',
        workingDays: [1, 2, 3, 4, 5],
      } as any);
      prisma.leavePolicy.findMany.mockResolvedValue([
        { leaveType: 'Sick', annualDays: 12 },
      ] as any);
      prisma.leave.findMany.mockResolvedValue([
        // Fri 2 Oct - Mon 5 Oct 2026: 2 working days
        {
          leaveType: 'Sick',
          status: 'APPROVED',
          startDate: new Date('2026-10-02T00:00:00Z'),
          endDate: new Date('2026-10-05T00:00:00Z'),
          durationMinutes: null,
        },
        {
          leaveType: 'Sick',
          status: 'PENDING',
          startDate: new Date('2026-10-07T00:00:00Z'),
          endDate: new Date('2026-10-07T00:00:00Z'),
          durationMinutes: null,
        },
        {
          leaveType: 'Permission',
          status: 'APPROVED',
          startDate: new Date('2026-10-08T00:00:00Z'),
          endDate: new Date('2026-10-08T00:00:00Z'),
          durationMinutes: 90,
        },
      ] as any);

      const balance = await service.getLeaveBalance('e1', 2026);

      expect(balance.types).toEqual([
        expect.objectContaining({
          leaveType: 'Permission',
          annualDays: null,
          usedMinutes: 90,
          usedDays: 0,
          remainingDays: null,
        }),
        expect.objectContaining({
          leaveType: 'Sick',
          annualDays: 12,
          usedDays: 2,
          pendingDays: 1,
          remainingDays: 10,
        }),
      ]);
    });
  });

  describe('exportAttendancesCsv', () => {
    it('writes one quoted row per session and defuses formulas', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        {
          checkIn: new Date('2026-10-05T03:30:00Z'),
          checkOut: new Date('2026-10-05T12:30:00Z'),
          status: 'checked_out',
          autoCheckedOut: true,
          workingMinutes: 480,
          breakMinutes: 60,
          permissionMinutes: 0,
          employee: { name: '=HYPERLINK("x")', email: 'a@x.com' },
          breaks: [
            { type: 'lunch', duration: 45 },
            { type: 'break', duration: 15 },
          ],
          dailyTasks: [{ status: 'completed' }, { status: 'blocked' }],
        },
      ] as any);

      const csv = await service.exportAttendancesCsv(
        'ALL',
        '2026-10-01',
        '2026-10-31',
      );
      const lines = csv.replace('\uFEFF', '').trim().split('\r\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toBe(
        '"2026-10-05","\'=HYPERLINK(""x"")","a@x.com","09:00","18:00","Yes","8.00","0.25","0.75","0.00","2","1"',
      );
    });

    it("refuses another employee's export outside the requester's scope", async () => {
      await expect(
        service.exportAttendancesCsv(['e1'], '2026-10-01', '2026-10-31', 'e2'),
      ).rejects.toThrow('cannot export');
    });
  });
});

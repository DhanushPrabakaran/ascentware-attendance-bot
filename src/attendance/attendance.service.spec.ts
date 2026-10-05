import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AttendanceService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: AttendanceService;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new AttendanceService(prisma as unknown as PrismaService);
  });

  describe('checkIn', () => {
    it('throws if no employee is linked to the Teams user', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);

      await expect(service.checkIn('teams-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.attendance.create).not.toHaveBeenCalled();
    });

    it('creates an attendance row for a linked employee', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
      } as any);
      prisma.attendance.create.mockResolvedValue({ id: 'att-1' } as any);
      prisma.attendance.findMany.mockResolvedValue([]);

      const result = await service.checkIn('teams-1');

      expect(prisma.attendance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          employeeId: 'emp-1',
          status: 'checked_in',
        }),
      });
      expect(result).toEqual({ id: 'att-1' });
    });
  });

  describe('checkOut', () => {
    it('throws if the attendance record does not exist', async () => {
      prisma.attendance.findUnique.mockResolvedValue(null);

      await expect(service.checkOut('att-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a double checkout', async () => {
      prisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        status: 'checked_out',
        checkIn: new Date(),
        breaks: [],
      } as any);

      await expect(service.checkOut('att-1')).rejects.toThrow(
        'Already checked out',
      );
      expect(prisma.attendance.update).not.toHaveBeenCalled();
    });

    it('computes working minutes net of break time', async () => {
      const checkIn = new Date('2026-01-01T09:00:00.000Z');
      const checkOut = new Date('2026-01-01T12:00:00.000Z'); // 180 min later

      jest.useFakeTimers().setSystemTime(checkOut);

      prisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        status: 'checked_in',
        checkIn,
        breaks: [{ duration: 15 }, { duration: 10 }],
      } as any);
      prisma.attendance.update.mockResolvedValue({} as any);

      await service.checkOut('att-1');

      expect(prisma.attendance.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: expect.objectContaining({
          status: 'checked_out',
          breakMinutes: 25,
          workingMinutes: 180 - 25,
        }),
      });

      jest.useRealTimers();
    });
  });

  describe('startBreak', () => {
    it('throws if the attendance record does not exist', async () => {
      prisma.attendance.findUnique.mockResolvedValue(null);

      await expect(service.startBreak('att-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects starting a break from a non-checked_in status', async () => {
      prisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        status: 'on_break',
      } as any);

      await expect(service.startBreak('att-1')).rejects.toThrow(
        'Cannot start break from current status',
      );
      expect(prisma.attendanceBreak.create).not.toHaveBeenCalled();
    });

    it('flips status to on_break and creates a break row when checked in', async () => {
      prisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        status: 'checked_in',
      } as any);
      prisma.attendance.update.mockResolvedValue({} as any);
      prisma.attendanceBreak.create.mockResolvedValue({ id: 'break-1' } as any);

      const result = await service.startBreak('att-1');

      expect(prisma.attendance.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: { status: 'on_break' },
      });
      expect(prisma.attendanceBreak.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ attendanceId: 'att-1' }),
      });
      expect(result).toEqual({ id: 'break-1' });
    });
  });

  describe('endBreak', () => {
    it('throws if there is no open break record', async () => {
      prisma.attendanceBreak.findFirst.mockResolvedValue(null);

      await expect(service.endBreak('att-1')).rejects.toThrow(
        'Break record not found',
      );
    });

    it('computes break duration and flips status back to checked_in', async () => {
      const breakStart = new Date('2026-01-01T09:00:00.000Z');
      const breakEnd = new Date('2026-01-01T09:12:00.000Z'); // 12 min later

      jest.useFakeTimers().setSystemTime(breakEnd);

      prisma.attendanceBreak.findFirst.mockResolvedValue({
        id: 'break-1',
        attendanceId: 'att-1',
        breakStart,
        breakEnd: null,
      } as any);
      prisma.attendanceBreak.update.mockResolvedValue({
        id: 'break-1',
        duration: 12,
      } as any);
      prisma.attendance.update.mockResolvedValue({} as any);

      const result = await service.endBreak('att-1');

      expect(prisma.attendanceBreak.update).toHaveBeenCalledWith({
        where: { id: 'break-1' },
        data: expect.objectContaining({ duration: 12 }),
      });
      expect(prisma.attendance.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: { status: 'checked_in' },
      });
      expect(result).toEqual({ id: 'break-1', duration: 12 });

      jest.useRealTimers();
    });
  });

  describe('autoCheckOutStale (IST midnight)', () => {
    // 09:00 IST on 5 Oct = 03:30 UTC; that day ends at 18:30 UTC (00:00 IST, 6 Oct).
    const checkIn = new Date('2026-10-05T03:30:00Z');
    const midnight = new Date('2026-10-05T18:30:00Z');
    const now = new Date('2026-10-06T04:00:00Z'); // 09:30 IST next day

    beforeEach(() => {
      // Run the transaction callback against the same mock client.
      prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
      prisma.attendance.updateMany.mockResolvedValue({ count: 1 });
    });

    it('only looks at open sessions that started before today (IST)', async () => {
      prisma.attendance.findMany.mockResolvedValue([]);
      await service.autoCheckOutStale(now, 'emp-1');
      expect(prisma.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { in: ['checked_in', 'on_break'] },
            checkIn: { lt: new Date('2026-10-05T18:30:00Z') },
            employeeId: 'emp-1',
          },
        }),
      );
    });

    it('checks out at midnight, closing an open lunch at midnight too', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        {
          id: 'att-1',
          checkIn,
          breaks: [
            // a finished 20 min break
            { id: 'b1', breakStart: checkIn, breakEnd: checkIn, duration: 20 },
            // lunch started 23:00 IST and never ended -> 60 min until midnight
            {
              id: 'b2',
              breakStart: new Date('2026-10-05T17:30:00Z'),
              breakEnd: null,
              duration: 0,
            },
          ],
        },
      ] as any);

      const closed = await service.autoCheckOutStale(now);

      expect(closed).toBe(1);
      // 09:00 -> 00:00 = 900 min, minus 20 + 60 of breaks
      expect(prisma.attendance.updateMany).toHaveBeenCalledWith({
        where: { id: 'att-1', status: { in: ['checked_in', 'on_break'] } },
        data: {
          checkOut: midnight,
          status: 'checked_out',
          autoCheckedOut: true,
          workingMinutes: 900 - 80,
          breakMinutes: 80,
        },
      });
      expect(prisma.attendanceBreak.update).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceBreak.update).toHaveBeenCalledWith({
        where: { id: 'b2' },
        data: { breakEnd: midnight, duration: 60 },
      });
    });

    it('leaves the record alone if a manual check-out won the race', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        {
          id: 'att-1',
          checkIn,
          breaks: [
            { id: 'b2', breakStart: checkIn, breakEnd: null, duration: 0 },
          ],
        },
      ] as any);
      prisma.attendance.updateMany.mockResolvedValue({ count: 0 });

      expect(await service.autoCheckOutStale(now)).toBe(0);
      expect(prisma.attendanceBreak.update).not.toHaveBeenCalled();
    });
  });

  describe('startBreak type', () => {
    it('records a lunch break type', async () => {
      prisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        status: 'checked_in',
      } as any);
      await service.startBreak('att-1', 'lunch');
      expect(prisma.attendanceBreak.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'lunch' }),
      });
    });
  });
});

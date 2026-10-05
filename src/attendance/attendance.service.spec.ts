import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttendanceService, autoCheckOutTime } from './attendance.service';
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
          employee: { shift: null },
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
          employee: { shift: null },
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

  describe('autoCheckOutTime (shift end)', () => {
    const checkIn = new Date('2026-10-05T03:30:00Z'); // 09:00 IST
    const shift = { startTime: '09:00', endTime: '18:00' };
    const shiftEnd = new Date('2026-10-05T12:30:00Z'); // 18:00 IST
    const midnight = new Date('2026-10-05T18:30:00Z');

    it('uses midnight without a shift', () => {
      expect(autoCheckOutTime(checkIn, [], null)).toEqual(midnight);
    });

    it("uses the end of the employee's shift", () => {
      expect(autoCheckOutTime(checkIn, [], shift)).toEqual(shiftEnd);
    });

    it('moves past the shift end to cover breaks taken after it', () => {
      const lateBreakEnd = new Date('2026-10-05T14:00:00Z'); // 19:30 IST
      expect(
        autoCheckOutTime(
          checkIn,
          [{ breakStart: shiftEnd, breakEnd: lateBreakEnd }],
          shift,
        ),
      ).toEqual(lateBreakEnd);
    });

    it('falls back to midnight for a night shift or a check-in after the shift', () => {
      expect(
        autoCheckOutTime(checkIn, [], { startTime: '22:00', endTime: '06:00' }),
      ).toEqual(midnight);
      const lateCheckIn = new Date('2026-10-05T13:30:00Z'); // 19:00 IST
      expect(autoCheckOutTime(lateCheckIn, [], shift)).toEqual(midnight);
    });

    it('closes a forgotten session at shift end in the sweep', async () => {
      prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
      prisma.attendance.updateMany.mockResolvedValue({ count: 1 });
      prisma.attendance.findMany.mockResolvedValue([
        { id: 'att-1', checkIn, employee: { shift }, breaks: [] },
      ] as any);

      await service.autoCheckOutStale(new Date('2026-10-06T04:00:00Z'));

      expect(prisma.attendance.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            checkOut: shiftEnd,
            workingMinutes: 540,
          }),
        }),
      );
    });
  });

  describe('correctCheckOut', () => {
    const checkIn = new Date('2026-10-05T03:30:00Z'); // 09:00 IST

    beforeEach(() => {
      prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
    });

    it('recomputes worked time and clips breaks running past the new time', async () => {
      prisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        checkIn,
        status: 'checked_out',
        breaks: [
          {
            id: 'b1',
            breakStart: new Date('2026-10-05T07:30:00Z'), // 13:00 IST
            breakEnd: new Date('2026-10-05T08:00:00Z'), // 13:30 IST
            duration: 30,
          },
          {
            id: 'b2',
            breakStart: new Date('2026-10-05T12:00:00Z'), // 17:30 IST
            breakEnd: new Date('2026-10-05T18:30:00Z'), // closed at midnight
            duration: 390,
          },
        ],
      } as any);

      await service.correctCheckOut('att-1', '18:00');

      const checkOut = new Date('2026-10-05T12:30:00Z');
      expect(prisma.attendanceBreak.update).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceBreak.update).toHaveBeenCalledWith({
        where: { id: 'b2' },
        data: { breakEnd: checkOut, duration: 30 },
      });
      expect(prisma.attendance.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          checkOut,
          workingMinutes: 540 - 60,
          breakMinutes: 60,
          autoCheckedOut: false,
        },
      });
    });

    it('rejects a time before check-in or a session still open', async () => {
      prisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        checkIn,
        status: 'checked_out',
        breaks: [],
      } as any);
      await expect(service.correctCheckOut('att-1', '08:00')).rejects.toThrow(
        'after the check-in',
      );

      prisma.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        checkIn,
        status: 'checked_in',
        breaks: [],
      } as any);
      await expect(service.correctCheckOut('att-1', '18:00')).rejects.toThrow(
        'finished session',
      );
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

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
});

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async checkIn(teamsUserId: string) {
    let employee = await this.prisma.employee.findUnique({
      where: { teamsUserId },
    });
    if (!employee) {
      employee = await this.prisma.employee.create({
        data: {
          name: 'Teams User',
          email: `${teamsUserId}@company.com`,
          teamsUserId,
        },
      });
    }

    return this.prisma.attendance.create({
      data: {
        employeeId: employee.id,
        checkIn: new Date(),
        status: 'checked_in',
      },
    });
  }

  async checkOut(attendanceId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { breaks: true },
    });
    if (!attendance) throw new BadRequestException('Attendance not found');
    if (attendance.status === 'checked_out')
      throw new BadRequestException('Already checked out');

    const checkOutTime = new Date();
    let totalBreakMinutes = 0;
    attendance.breaks.forEach((b) => {
      totalBreakMinutes += b.duration;
    });

    const checkInTime = new Date(attendance.checkIn);
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const workingMinutes = Math.floor(diffMs / 60000) - totalBreakMinutes;

    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkOut: checkOutTime,
        status: 'checked_out',
        workingMinutes,
        breakMinutes: totalBreakMinutes,
      },
    });
  }

  async startBreak(attendanceId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });
    if (!attendance) throw new BadRequestException('Attendance not found');
    if (attendance.status !== 'checked_in')
      throw new BadRequestException('Cannot start break from current status');

    await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: { status: 'on_break' },
    });

    return this.prisma.attendanceBreak.create({
      data: {
        attendanceId,
        breakStart: new Date(),
      },
    });
  }

  async endBreak(attendanceId: string) {
    const breakRecord = await this.prisma.attendanceBreak.findFirst({
      where: {
        attendanceId,
        breakEnd: null,
      },
      orderBy: { breakStart: 'desc' },
    });

    if (!breakRecord) throw new BadRequestException('Break record not found');
    if (breakRecord.breakEnd)
      throw new BadRequestException('Break already ended');

    const breakEnd = new Date();
    const breakStart = new Date(breakRecord.breakStart);
    const duration = Math.floor(
      (breakEnd.getTime() - breakStart.getTime()) / 60000,
    );

    const updatedBreak = await this.prisma.attendanceBreak.update({
      where: { id: breakRecord.id },
      data: {
        breakEnd,
        duration,
      },
    });

    await this.prisma.attendance.update({
      where: { id: breakRecord.attendanceId },
      data: { status: 'checked_in' },
    });

    return updatedBreak;
  }
}

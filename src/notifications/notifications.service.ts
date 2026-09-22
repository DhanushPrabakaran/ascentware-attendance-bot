import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    employeeId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    return this.prisma.notification.create({
      data: { employeeId, type, title, message, link },
    });
  }

  async createMany(
    employeeIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    if (employeeIds.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({
      data: employeeIds.map((employeeId) => ({
        employeeId,
        type,
        title,
        message,
        link,
      })),
    });
  }

  async listForEmployee(
    employeeId: string,
    opts: { unreadOnly?: boolean } = {},
  ) {
    return this.prisma.notification.findMany({
      where: {
        employeeId,
        ...(opts.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: string, employeeId: string) {
    // Fetch-then-check rather than a where-clause update so a mismatched owner gets a
    // clean 404 instead of a silent no-op, without ever confirming whether the id exists.
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification || notification.employeeId !== employeeId) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(employeeId: string) {
    return this.prisma.notification.updateMany({
      where: { employeeId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}

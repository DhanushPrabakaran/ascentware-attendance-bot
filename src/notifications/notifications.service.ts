import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

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
    opts: {
      unreadOnly?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const page = opts.page ?? DEFAULT_PAGE;
    const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = {
      employeeId,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total, page, pageSize };
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

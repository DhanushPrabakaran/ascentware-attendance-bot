import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, NotificationType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  describe('createMany', () => {
    it('is a no-op for an empty recipient list', async () => {
      const result = await service.createMany(
        [],
        NotificationType.LEAVE_APPLIED,
        'title',
        'message',
      );
      expect(result).toEqual({ count: 0 });
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('creates one row per recipient', async () => {
      await service.createMany(
        ['a', 'b'],
        NotificationType.LEAVE_APPLIED,
        'title',
        'message',
        '/leaves/1',
      );
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            employeeId: 'a',
            type: NotificationType.LEAVE_APPLIED,
            title: 'title',
            message: 'message',
            link: '/leaves/1',
          },
          {
            employeeId: 'b',
            type: NotificationType.LEAVE_APPLIED,
            title: 'title',
            message: 'message',
            link: '/leaves/1',
          },
        ],
      });
    });
  });

  describe('markRead', () => {
    it("throws NotFoundException rather than updating someone else's notification", async () => {
      prisma.notification.findUnique.mockResolvedValueOnce({
        id: 'n1',
        employeeId: 'owner',
      } as any);

      await expect(service.markRead('n1', 'not-the-owner')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a notification that does not exist', async () => {
      prisma.notification.findUnique.mockResolvedValueOnce(null);
      await expect(service.markRead('missing', 'someone')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('marks read when the caller owns the notification', async () => {
      prisma.notification.findUnique.mockResolvedValueOnce({
        id: 'n1',
        employeeId: 'owner',
      } as any);

      await service.markRead('n1', 'owner');

      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'n1' } }),
      );
    });
  });
});

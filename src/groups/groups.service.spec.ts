import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { GroupsService } from './groups.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GroupsService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: GroupsService;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new GroupsService(prisma as unknown as PrismaService);
  });

  describe('getTargetsForEmployee', () => {
    it("sends to the employee's assigned active groups only", async () => {
      prisma.employee.findUnique.mockResolvedValue({
        groups: [
          { conversationId: 'team-a', isActive: true },
          { conversationId: 'team-b', isActive: false },
        ],
      } as any);

      await expect(
        service.getTargetsForEmployee({ teamsUserId: 'u1' }),
      ).resolves.toEqual(['team-a']);
      expect(prisma.teamsGroup.findMany).not.toHaveBeenCalled();
    });

    it('falls back to the default groups when none are assigned', async () => {
      prisma.employee.findUnique.mockResolvedValue({ groups: [] } as any);
      prisma.teamsGroup.findMany.mockResolvedValue([
        { conversationId: 'common' },
      ] as any);

      await expect(
        service.getTargetsForEmployee({ id: 'e1' }),
      ).resolves.toEqual(['common']);
      expect(prisma.teamsGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isDefault: true, isActive: true } }),
      );
    });

    it('falls back to the default groups for an unknown employee', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      prisma.teamsGroup.findMany.mockResolvedValue([
        { conversationId: 'common' },
      ] as any);

      await expect(
        service.getTargetsForEmployee({ teamsUserId: 'nobody' }),
      ).resolves.toEqual(['common']);
    });

    it('does not fall back to defaults when assigned groups are all inactive', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        groups: [{ conversationId: 'team-b', isActive: false }],
      } as any);

      await expect(
        service.getTargetsForEmployee({ id: 'e1' }),
      ).resolves.toEqual([]);
      expect(prisma.teamsGroup.findMany).not.toHaveBeenCalled();
    });
  });
});

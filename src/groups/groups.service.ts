import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const groups = await this.prisma.teamsGroup.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
    return groups.map(({ _count, ...group }) => ({
      ...group,
      employeeCount: _count.employees,
    }));
  }

  async create(data: {
    name: string;
    conversationId: string;
    isDefault?: boolean;
  }) {
    try {
      return await this.prisma.teamsGroup.create({
        data: {
          name: data.name.trim(),
          conversationId: data.conversationId.trim(),
          isDefault: data.isDefault ?? false,
          // Only reachable from the UI after a successful test send.
          lastTestedAt: new Date(),
        },
      });
    } catch (e) {
      throw this.mapPrismaError(e);
    }
  }

  async update(
    id: string,
    data: { name?: string; conversationId?: string; isDefault?: boolean },
  ) {
    try {
      return await this.prisma.teamsGroup.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          conversationId: data.conversationId?.trim(),
          isDefault: data.isDefault,
        },
      });
    } catch (e) {
      throw this.mapPrismaError(e);
    }
  }

  /** Employee assignments go with it (join rows cascade); the Teams chat itself is untouched. */
  async remove(id: string) {
    try {
      return await this.prisma.teamsGroup.delete({ where: { id } });
    } catch (e) {
      throw this.mapPrismaError(e);
    }
  }

  async markTested(conversationId: string) {
    await this.prisma.teamsGroup.updateMany({
      where: { conversationId },
      data: { lastTestedAt: new Date() },
    });
  }

  /** Bot membership changes (TeamsAttendanceBot's membersAdded/membersRemoved). Only
   *  touches groups an admin already registered - unknown chats are never auto-added,
   *  so a new chat can't start receiving everyone's announcements on its own. */
  async setActiveByConversationId(conversationId: string, isActive: boolean) {
    const result = await this.prisma.teamsGroup.updateMany({
      where: { conversationId },
      data: { isActive },
    });
    return result.count > 0;
  }

  /**
   * Conversation IDs an employee's announcements go to: their assigned groups, or the
   * default groups when they have none assigned. Inactive groups (bot removed) are
   * skipped. An unknown employee also gets the defaults, matching the old behaviour
   * where every announcement went to the common group(s).
   */
  async getTargetsForEmployee(
    where: { id: string } | { teamsUserId: string },
  ): Promise<string[]> {
    const employee = await this.prisma.employee.findUnique({
      where,
      select: {
        groups: { select: { conversationId: true, isActive: true } },
      },
    });

    if (employee && employee.groups.length > 0) {
      return employee.groups
        .filter((g) => g.isActive)
        .map((g) => g.conversationId);
    }

    const defaults = await this.prisma.teamsGroup.findMany({
      where: { isDefault: true, isActive: true },
      select: { conversationId: true },
    });
    return defaults.map((g) => g.conversationId);
  }

  /**
   * Each active group with the people whose announcements go there - the same rule as
   * getTargetsForEmployee, seen from the group's side: its assigned employees, plus
   * everyone with no groups at all when it's a default group. Only active employees
   * linked to Teams are included. Used by the daily digests.
   */
  async getActiveGroupsWithMembers() {
    const memberWhere = { isActive: true, teamsUserId: { not: null } };
    const memberSelect = { id: true, name: true };
    const groups = await this.prisma.teamsGroup.findMany({
      where: { isActive: true },
      include: { employees: { where: memberWhere, select: memberSelect } },
      orderBy: { name: 'asc' },
    });
    const unassigned = groups.some((g) => g.isDefault)
      ? await this.prisma.employee.findMany({
          where: { ...memberWhere, groups: { none: {} } },
          select: memberSelect,
        })
      : [];

    return groups.map((g) => {
      const members = new Map<string, { id: string; name: string }>();
      for (const e of [...g.employees, ...(g.isDefault ? unassigned : [])]) {
        members.set(e.id, e);
      }
      return {
        id: g.id,
        name: g.name,
        conversationId: g.conversationId,
        members: Array.from(members.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      };
    });
  }

  private mapPrismaError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return new ConflictException(
          'A group with this conversation ID already exists',
        );
      }
      if (e.code === 'P2025') {
        return new NotFoundException('Group not found');
      }
    }
    return e;
  }
}

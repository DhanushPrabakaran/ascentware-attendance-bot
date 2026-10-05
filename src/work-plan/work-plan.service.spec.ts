import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { WorkPlanService } from './work-plan.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WorkPlanService.saveDailyPlan', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: WorkPlanService;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new WorkPlanService(prisma as unknown as PrismaService);
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
    prisma.attendance.findUnique.mockResolvedValue({ employeeId: 'e1' } as any);
    prisma.dailyTask.create.mockImplementation(
      (args: any) => Promise.resolve(args.data) as any,
    );
  });

  it("links tasks carried over from the last day's unfinished ones", async () => {
    prisma.attendance.findFirst.mockResolvedValue({
      checkIn: new Date(),
      dailyTasks: [
        { id: 'old-1', taskName: 'Fix login' },
        { id: 'old-2', taskName: 'Write docs' },
      ],
    } as any);

    const created = await service.saveDailyPlan('att-2', [
      { taskName: '  fix LOGIN ' },
      { taskName: 'Brand new task' },
    ]);

    expect(created.map((t: any) => t.carriedFromId)).toEqual(['old-1', null]);
    expect(created.map((t: any) => t.position)).toEqual([0, 1]);
  });
});

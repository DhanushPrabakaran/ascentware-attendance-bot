import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskInputDto } from './dto/save-daily-plan.dto';
import { BulkTaskUpdateItemDto } from './dto/bulk-update-task.dto';

/** Tasks in the order the employee entered them. */
export const TASK_ORDER = [
  { position: 'asc' as const },
  { createdAt: 'asc' as const },
];

@Injectable()
export class WorkPlanService {
  constructor(private prisma: PrismaService) {}

  async saveDailyPlan(
    attendanceId: string,
    tasks: TaskInputDto[],
    permissionMinutes?: number,
  ) {
    if (permissionMinutes !== undefined) {
      await this.prisma.attendance.update({
        where: { id: attendanceId },
        data: { permissionMinutes },
      });
    }

    // Saving replaces the whole plan (that's how "Add / Edit Plan" works). One
    // transaction so a failure can't leave the day with no tasks.
    return this.prisma.$transaction(async (tx) => {
      await tx.dailyTask.deleteMany({ where: { attendanceId } });
      const created = [];
      for (const [position, task] of tasks.entries()) {
        created.push(
          await tx.dailyTask.create({
            data: {
              attendanceId,
              taskName: task.taskName,
              estimatedMinutes: task.estimatedMinutes ?? 0,
              priority: task.priority || 'normal',
              status: 'not_started',
              position,
            },
          }),
        );
      }
      return created;
    });
  }

  async updateTaskProgress(
    taskId: string,
    data: { status: string; timeTakenMinutes?: number; remarks?: string },
  ) {
    return this.prisma.dailyTask.update({
      where: { id: taskId },
      data: {
        status: data.status,
        timeTakenMinutes: data.timeTakenMinutes ?? 0,
        remarks: data.remarks,
      },
    });
  }

  async saveSummary(
    attendanceId: string,
    data: { overallStatus: string; blockerType?: string; remarks?: string },
  ) {
    return this.prisma.dailySummary.create({
      data: {
        attendanceId,
        overallStatus: data.overallStatus,
        blockerType: data.blockerType,
        remarks: data.remarks,
      },
    });
  }

  async getTasksByAttendanceId(attendanceId: string) {
    return this.prisma.dailyTask.findMany({
      where: { attendanceId },
      orderBy: TASK_ORDER,
    });
  }

  /**
   * Tasks left unfinished (anything not marked completed) on the employee's most recent
   * earlier working day - offered pre-filled in the next check-in's plan card. Only that
   * one day is looked at, so a task dropped once doesn't keep coming back.
   */
  async getUnfinishedTasksFromLastDay(
    employeeId: string,
    excludeAttendanceId: string,
  ) {
    const last = await this.prisma.attendance.findFirst({
      where: { employeeId, id: { not: excludeAttendanceId } },
      orderBy: { checkIn: 'desc' },
      include: {
        dailyTasks: {
          where: { status: { not: 'completed' } },
          orderBy: TASK_ORDER,
        },
      },
    });
    if (!last || last.dailyTasks.length === 0) return null;
    return { date: last.checkIn, tasks: last.dailyTasks };
  }

  async bulkUpdateTaskProgress(tasks: BulkTaskUpdateItemDto[]) {
    const results = [];
    for (const task of tasks) {
      const updated = await this.prisma.dailyTask.update({
        where: { id: task.id },
        data: {
          status: task.status,
          timeTakenMinutes: task.timeTakenMinutes ?? 0,
          remarks: task.remarks,
        },
      });
      results.push(updated);
    }
    return results;
  }
}

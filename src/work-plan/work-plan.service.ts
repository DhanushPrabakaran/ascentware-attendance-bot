import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskInputDto } from './dto/save-daily-plan.dto';
import { BulkTaskUpdateItemDto } from './dto/bulk-update-task.dto';

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

    // Delete existing tasks for this attendance so that editing works properly
    await this.prisma.dailyTask.deleteMany({
      where: { attendanceId },
    });

    const createdTasks = await Promise.all(
      tasks.map((task) =>
        this.prisma.dailyTask.create({
          data: {
            attendanceId,
            taskName: task.taskName,
            estimatedMinutes: task.estimatedMinutes ?? 0,
            priority: task.priority || 'normal',
            status: 'not_started',
          },
        }),
      ),
    );
    return createdTasks;
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
      orderBy: { id: 'asc' },
    });
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

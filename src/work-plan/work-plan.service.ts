import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkPlanService {
  constructor(private prisma: PrismaService) {}

  async saveDailyPlan(attendanceId: string, tasks: any[], permissionMinutes: any) {
    if (permissionMinutes !== undefined) {
      await this.prisma.attendance.update({
        where: { id: attendanceId },
        data: { permissionMinutes: parseInt(permissionMinutes, 10) || 0 }
      });
    }

    const createdTasks = await Promise.all(tasks.map(task => 
      this.prisma.dailyTask.create({
        data: {
          attendanceId,
          taskName: task.taskName,
          estimatedMinutes: parseInt(task.estimatedMinutes, 10) || 0,
          priority: task.priority || 'normal',
          status: 'not_started'
        }
      })
    ));
    return createdTasks;
  }

  async updateTaskProgress(taskId: string, data: any) {
    return this.prisma.dailyTask.update({
      where: { id: taskId },
      data: { 
        status: data.status,
        timeTakenMinutes: parseInt(data.timeTakenMinutes, 10) || 0,
        remarks: data.remarks
      }
    });
  }

  async saveSummary(attendanceId: string, data: any) {
    return this.prisma.dailySummary.create({
      data: {
        attendanceId,
        overallStatus: data.overallStatus,
        blockerType: data.blockerType,
        remarks: data.remarks
      }
    });
  }

  async getTasksByAttendanceId(attendanceId: string) {
    return this.prisma.dailyTask.findMany({
      where: { attendanceId },
      orderBy: { id: 'asc' }
    });
  }

  async bulkUpdateTaskProgress(tasks: any[]) {
    const results = [];
    for (const task of tasks) {
      if (!task.id) continue;
      const updated = await this.prisma.dailyTask.update({
        where: { id: task.id },
        data: {
          status: task.status,
          timeTakenMinutes: parseInt(task.timeTakenMinutes, 10) || 0,
          remarks: task.remarks
        }
      });
      results.push(updated);
    }
    return results;
  }
}

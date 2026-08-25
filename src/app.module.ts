import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AttendanceModule } from './attendance/attendance.module';
import { WorkPlanModule } from './work-plan/work-plan.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [PrismaModule, AttendanceModule, WorkPlanModule, BotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AttendanceModule } from './attendance/attendance.module';
import { WorkPlanModule } from './work-plan/work-plan.module';
import { BotModule } from './bot/bot.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    AttendanceModule,
    WorkPlanModule,
    BotModule,
    AdminModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}

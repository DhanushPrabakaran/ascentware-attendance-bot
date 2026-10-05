import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AttendanceService } from './attendance.service';

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Checks out anyone who forgot to, at midnight (company timezone). Sweeps on boot and
 * every few minutes rather than firing once at 00:00: Render's free tier sleeps when
 * idle, so a single midnight timer could be missed. That's safe because the check-out
 * time recorded is always the midnight itself, not when the sweep ran - and
 * AttendanceService also sweeps lazily before any check-in/status lookup.
 */
@Injectable()
export class AutoCheckoutService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly logger: Logger,
  ) {}

  onApplicationBootstrap() {
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep() {
    try {
      const closed = await this.attendanceService.autoCheckOutStale();
      if (closed > 0) {
        this.logger.log(
          `Auto-checked-out ${closed} session(s) left open past midnight.`,
          AutoCheckoutService.name,
        );
      }
    } catch (e: any) {
      this.logger.error(
        `Auto check-out sweep failed: ${e.message}`,
        e.stack,
        AutoCheckoutService.name,
      );
    }
  }
}

import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';

const PING_MS = 10 * 60 * 1000;

/**
 * Render's free tier stops the server after ~15 minutes without inbound requests, which
 * makes the first Teams reply each morning slow and delays reminders/digests. When
 * enabled, this pings the app's own public health URL often enough to keep it awake.
 *
 * Off unless configured: set KEEP_AWAKE_URL to the public base URL, or KEEP_AWAKE=true
 * on Render (which provides RENDER_EXTERNAL_URL). One always-on free instance uses
 * ~744 of Render's 750 free instance hours a month.
 */
@Injectable()
export class KeepAwakeService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;

  constructor(private readonly logger: Logger) {}

  static targetUrl(env: NodeJS.ProcessEnv = process.env): string | null {
    const base =
      env.KEEP_AWAKE_URL ||
      (env.KEEP_AWAKE === 'true' ? env.RENDER_EXTERNAL_URL : undefined);
    return base ? `${base.replace(/\/+$/, '')}/api/v1/health` : null;
  }

  onApplicationBootstrap() {
    const url = KeepAwakeService.targetUrl();
    if (!url) return;
    this.logger.log(`Keep-awake pinging ${url}`, KeepAwakeService.name);
    this.timer = setInterval(() => {
      fetch(url).catch((e: Error) =>
        this.logger.warn(
          `Keep-awake ping failed: ${e.message}`,
          KeepAwakeService.name,
        ),
      );
    }, PING_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

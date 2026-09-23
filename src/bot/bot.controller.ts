import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { BotService } from './bot.service';
import { Public } from '../auth/decorators/public.decorator';

// Bot Framework authenticates these requests itself (a Microsoft-issued JWT
// validated inside botService.handler), a completely separate trust boundary
// from our own admin JWT - so this controller opts out of JwtAuthGuard.
@Public()
@Controller('api/messages')
export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly logger: Logger,
  ) {}

  @Post()
  async processMessage(@Req() req: Request, @Res() res: Response) {
    this.logger.log(
      `Received message from Bot Framework. Method: ${req.method}, Auth: ${req.headers.authorization ? 'Present' : 'Missing'}`,
      BotController.name,
    );
    try {
      await this.botService.handler(req, res, () => {
        this.logger.log(
          'Next was called by JWT middleware',
          BotController.name,
        );
      });
      this.logger.log(
        `Request processed. Headers sent: ${res.headersSent}`,
        BotController.name,
      );
    } catch (e: any) {
      this.logger.error(
        `Error processing message: ${e.message}`,
        e.stack,
        BotController.name,
      );
      if (!res.headersSent) {
        res.status(500).send(e.message);
      }
    }
  }
}

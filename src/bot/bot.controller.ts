import { Controller, Post, Req, Res, All } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BotService } from './bot.service';

@Controller('api/messages')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post()
  async processMessage(@Req() req: Request, @Res() res: Response) {
    console.log(
      `[BotController] Received message from Bot Framework! Method: ${req.method}, Auth: ${req.headers.authorization ? 'Present' : 'Missing'}`,
    );
    try {
      await this.botService.handler(req, res, () => {
        console.log('[BotController] Next was called by JWT middleware!');
      });
      console.log(
        `[BotController] Request processed. Headers sent: ${res.headersSent}`,
      );
    } catch (e: any) {
      console.error('[BotController] Error processing message:', e);
      if (!res.headersSent) {
        res.status(500).send(e.message);
      }
    }
  }
}

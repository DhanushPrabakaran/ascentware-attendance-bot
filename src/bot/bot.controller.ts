import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BotService } from './bot.service';

@Controller('api/messages')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post()
  async processMessage(@Req() req: Request, @Res() res: Response) {
    await this.botService.process(req, res);
  }
}

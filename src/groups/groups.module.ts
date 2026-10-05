import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';

// The HTTP controller lives in BotModule (bot/groups.controller.ts) because the
// "send test message" endpoint needs the bot's adapter, and BotModule already
// depends on this module.
@Module({
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}

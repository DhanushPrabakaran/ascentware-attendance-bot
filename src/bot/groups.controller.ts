import {
  BadGatewayException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { Roles } from '../auth/decorators/roles.decorator';
import { GroupsService } from '../groups/groups.service';
import {
  CreateGroupDto,
  TestGroupDto,
  UpdateGroupDto,
} from '../groups/dto/group.dto';
import { BotService } from './bot.service';

// Lives in BotModule rather than GroupsModule: the test endpoint needs BotService's adapter.
@Roles(Role.ADMIN)
@Controller('api/v1/admin/groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly botService: BotService,
    private readonly logger: Logger,
  ) {}

  @Get()
  list() {
    return this.groupsService.list();
  }

  /** Posts a test message into the chat so the admin can confirm the ID before saving. */
  @Post('test')
  async test(@Body() dto: TestGroupDto) {
    const conversationId = dto.conversationId.trim();
    try {
      await this.botService.sendToConversation(
        conversationId,
        '✅ Test message from the Ascentware attendance bot - this group is connected and will receive attendance and leave announcements.',
      );
    } catch (err: any) {
      this.logger.warn(
        `Test message to ${conversationId} failed: ${err.message}`,
        GroupsController.name,
      );
      throw new BadGatewayException(
        `Teams rejected the message: ${err.message}. Check the bot has been added to this chat and the ID is correct.`,
      );
    }
    await this.groupsService.markTested(conversationId);
    return { success: true };
  }

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }
}

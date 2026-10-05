import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { IsDateString, IsOptional } from 'class-validator';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { dateKey } from '../common/time';

class DayQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}

class RangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** Defaults to the 30 days ending today. */
function range(query: RangeQueryDto) {
  const to = (query.to ?? dateKey(new Date())).slice(0, 10);
  const from = (
    query.from ??
    new Date(Date.parse(`${to}T12:00:00Z`) - 29 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10)
  ).slice(0, 10);
  return { from, to };
}

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('day')
  getDay(@CurrentUser() user: JwtPayload, @Query() query: DayQueryDto) {
    return this.reports.getDay(user, query.date?.slice(0, 10));
  }

  @Get('attention')
  getAttention(@CurrentUser() user: JwtPayload) {
    return this.reports.getAttention(user);
  }

  @Get('people')
  getPeople(@CurrentUser() user: JwtPayload, @Query() query: RangeQueryDto) {
    const { from, to } = range(query);
    return this.reports.getPeople(user, from, to);
  }

  @Get('employees/:id')
  getEmployee(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RangeQueryDto,
  ) {
    const { from, to } = range(query);
    return this.reports.getEmployeeReport(user, id, from, to);
  }
}

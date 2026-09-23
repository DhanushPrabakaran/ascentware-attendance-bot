import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveSummaryDto {
  @IsUUID()
  attendanceId: string;

  @IsString()
  overallStatus: string;

  @IsOptional()
  @IsString()
  blockerType?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

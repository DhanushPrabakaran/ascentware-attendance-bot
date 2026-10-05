import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateLeaveDto {
  @IsString()
  @IsNotEmpty()
  leaveType: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  // Leave in hours: both set, on startDate. Omit both for full-day leave.
  @IsOptional()
  @Matches(HH_MM, { message: 'startTime must be HH:mm' })
  startTime?: string;

  @IsOptional()
  @Matches(HH_MM, { message: 'endTime must be HH:mm' })
  endTime?: string;
}

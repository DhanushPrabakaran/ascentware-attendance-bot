import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CorrectCheckOutDto {
  @Matches(HH_MM, { message: 'time must be HH:mm' })
  time: string;
}

export class AttendanceExportQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

export class LeaveBalanceQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

export class LeavePolicyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  leaveType: string;

  @IsInt()
  @Min(0)
  @Max(366)
  annualDays: number;
}

export class ScheduleSettingsDto {
  @IsOptional()
  @IsBoolean()
  remindersEnabled?: boolean;

  @IsOptional()
  @Matches(HH_MM, { message: 'checkInReminderTime must be HH:mm' })
  checkInReminderTime?: string;

  @IsOptional()
  @Matches(HH_MM, { message: 'checkOutReminderTime must be HH:mm' })
  checkOutReminderTime?: string;

  @IsOptional()
  @IsBoolean()
  digestsEnabled?: boolean;

  @IsOptional()
  @Matches(HH_MM, { message: 'morningDigestTime must be HH:mm' })
  morningDigestTime?: string;

  @IsOptional()
  @Matches(HH_MM, { message: 'eveningDigestTime must be HH:mm' })
  eveningDigestTime?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  workingDays?: number[];
}

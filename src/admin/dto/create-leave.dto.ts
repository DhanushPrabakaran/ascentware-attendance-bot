import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

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
}

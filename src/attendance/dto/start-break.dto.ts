import { IsUUID } from 'class-validator';

export class StartBreakDto {
  @IsUUID()
  attendanceId: string;
}

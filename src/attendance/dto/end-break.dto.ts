import { IsUUID } from 'class-validator';

export class EndBreakDto {
  @IsUUID()
  attendanceId: string;
}

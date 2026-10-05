import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class StartBreakDto {
  @IsUUID()
  attendanceId: string;

  @IsOptional()
  @IsIn(['break', 'lunch'])
  type?: 'break' | 'lunch';
}

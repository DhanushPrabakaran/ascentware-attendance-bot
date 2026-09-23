import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const TASK_STATUSES = ['not_started', 'in_progress', 'completed'];

export class UpdateTaskProgressDto {
  @IsIn(TASK_STATUSES)
  status: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeTakenMinutes?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

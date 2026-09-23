import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

const TASK_STATUSES = ['not_started', 'in_progress', 'completed'];

export class BulkTaskUpdateItemDto {
  @IsUUID()
  id: string;

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

export class BulkUpdateTaskDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTaskUpdateItemDto)
  tasks: BulkTaskUpdateItemDto[];
}

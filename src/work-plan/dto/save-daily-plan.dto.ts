import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class TaskInputDto {
  @IsString()
  taskName: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;
}

export class SaveDailyPlanDto {
  @IsUUID()
  attendanceId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskInputDto)
  tasks: TaskInputDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  permissionMinutes?: number;
}

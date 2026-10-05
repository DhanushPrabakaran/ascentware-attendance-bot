import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class TestGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  conversationId: string;
}

export class CreateGroupDto extends TestGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}

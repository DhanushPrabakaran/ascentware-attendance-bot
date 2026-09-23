import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  teamsUserId?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  managerEmails?: string[];

  @IsOptional()
  @IsEmail()
  hrEmail?: string;

  @IsOptional()
  @IsUUID()
  shiftId?: string;

  // v1: admin sets an initial password directly - no email/invite flow yet.
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

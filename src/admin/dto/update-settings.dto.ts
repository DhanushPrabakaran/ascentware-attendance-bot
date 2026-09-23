import { IsOptional, IsString } from 'class-validator';

// Deliberately excludes any password/credential fields - those only ever change
// through the dedicated auth endpoints (POST settings/password, employees/:id/password).
export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  commonGroupId?: string;
}

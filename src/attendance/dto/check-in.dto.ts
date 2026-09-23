import { IsNotEmpty, IsString } from 'class-validator';

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  teamsUserId: string;
}

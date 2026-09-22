import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('api/v1/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() data: LoginDto) {
    return this.authService.login(data.email, data.password);
  }

  @Post('settings/password')
  async changePassword(
    @CurrentUser() user: { sub: string },
    @Body() data: ChangePasswordDto,
  ) {
    await this.authService.changeOwnPassword(
      user.sub,
      data.currentPassword,
      data.newPassword,
    );
    return { success: true };
  }
}

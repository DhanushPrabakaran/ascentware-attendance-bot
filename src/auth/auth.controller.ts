import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('api/v1/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() data: { username: string; password: string }) {
    return this.authService.login(data.username, data.password);
  }

  @Post('settings/password')
  async changePassword(
    @Body() data: { currentPassword: string; newPassword: string },
  ) {
    await this.authService.changePassword(
      data.currentPassword,
      data.newPassword,
    );
    return { success: true };
  }
}

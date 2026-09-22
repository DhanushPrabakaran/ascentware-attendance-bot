import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { AdminService } from '../admin/admin.service';

@Controller('api/v1/admin')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() data: LoginDto) {
    return this.authService.login(data.email, data.password);
  }

  // Re-validates isActive server-side on every load (catches mid-session deactivation)
  // instead of the frontend just decoding the JWT client-side.
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    const employee = await this.adminService.getEmployeeById(user.sub);
    if (!employee || !employee.isActive) {
      throw new UnauthorizedException();
    }
    return {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      hrEmail: employee.hrEmail,
      isManager: user.isManager,
    };
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

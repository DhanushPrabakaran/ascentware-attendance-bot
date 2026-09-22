import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<{ token: string }> {
    const settings = await this.adminService.getSettings();
    const isValidPassword = await bcrypt.compare(
      password || '',
      settings.adminPasswordHash,
    );

    if (username !== settings.adminUsername || !isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: 'admin',
      username: settings.adminUsername,
      role: 'ADMIN',
    });

    return { token };
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const settings = await this.adminService.getSettings();
    const isValid = await bcrypt.compare(
      currentPassword || '',
      settings.adminPasswordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new UnauthorizedException(
        'New password must be at least 8 characters',
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.adminService.updateAdminPasswordHash(newHash);
  }
}

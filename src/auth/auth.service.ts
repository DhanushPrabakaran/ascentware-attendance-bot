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

  async login(email: string, password: string): Promise<{ token: string }> {
    const employee = await this.adminService.findEmployeeByEmail(email || '');

    // Collapse "no such account", "not active", and "no password set yet" into the
    // same generic failure as a wrong password - don't leak account existence.
    if (!employee || !employee.isActive || !employee.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(
      password || '',
      employee.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: employee.id,
      email: employee.email,
      name: employee.name,
      role: employee.role,
    });

    return { token };
  }

  async changeOwnPassword(
    employeeId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const employee = await this.adminService.getEmployeeById(employeeId);
    if (!employee?.passwordHash) {
      throw new UnauthorizedException('No password set for this account');
    }

    const isValid = await bcrypt.compare(
      currentPassword || '',
      employee.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new UnauthorizedException(
        'New password must be at least 8 characters',
      );
    }

    await this.adminService.setEmployeePassword(employeeId, newPassword);
  }
}

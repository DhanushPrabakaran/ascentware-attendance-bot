import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

function makeContext(user: any): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;
  let metadata: Map<string, any>;

  beforeEach(() => {
    metadata = new Map();
    reflector = {
      getAllAndOverride: (key: string) => metadata.get(key),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  it('bypasses @Public() routes without checking roles at all', () => {
    metadata.set(IS_PUBLIC_KEY, true);
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows any authenticated user through when no @Roles() is set', () => {
    expect(guard.canActivate(makeContext({ role: Role.EMPLOYEE }))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    metadata.set(ROLES_KEY, [Role.ADMIN, Role.HR]);
    expect(guard.canActivate(makeContext({ role: Role.HR }))).toBe(true);
  });

  it('throws ForbiddenException for a role not in the required list', () => {
    metadata.set(ROLES_KEY, [Role.ADMIN]);
    expect(() =>
      guard.canActivate(makeContext({ role: Role.EMPLOYEE })),
    ).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when there is no user at all', () => {
    metadata.set(ROLES_KEY, [Role.ADMIN]);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});

import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Declares which roles may call a route. Combine with @Public() only on routes that don't need auth at all. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

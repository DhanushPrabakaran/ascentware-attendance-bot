import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route (or an entire controller) out of the global JwtAuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

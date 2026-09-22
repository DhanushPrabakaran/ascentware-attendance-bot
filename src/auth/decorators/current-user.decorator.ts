import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Reads the JWT payload JwtAuthGuard already attached to the request as `request.user`. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);

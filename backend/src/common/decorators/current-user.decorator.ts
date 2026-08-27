import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator to extract the authenticated user from the request.
 * Usage: @CurrentUser() user: { id: string; email: string }
 *
 * Phase 7 will wire this up with the AuthGuard + JwtStrategy.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user?.[data] : user;
  },
);

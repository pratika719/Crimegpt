import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

/**
 * AuthGuard — Placeholder for JWT authentication (Phase 7).
 *
 * Currently extracts user ID from x-user-id header for development.
 * Will be replaced with Passport.js + JWT strategy in Phase 7.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // TODO: Replace with JWT validation in Phase 7
    // For now, accept user ID from header for development/testing
    const userId = request.headers['x-user-id'];

    if (!userId) {
      this.logger.warn('No user ID provided in request');
      throw new UnauthorizedException('User not authenticated');
    }

    // Attach userId to request for @CurrentUser decorator
    request.user = { id: userId };
    return true;
  }
}

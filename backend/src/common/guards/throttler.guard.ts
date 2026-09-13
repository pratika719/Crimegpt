/**
 * RateLimitGuard — throttles requests per IP (unauthenticated) or per user (authenticated).
 *
 * Key selection:
 *   - Authenticated requests (those that passed AuthGuard) key by user ID so that
 *     per-user limits (e.g. document generation: 5 per 10 minutes) apply correctly.
 *   - Unauthenticated requests fall back to IP.
 *
 * The global ThrottlerModule limit (60/min) is enforced on top of any method-level
 * @Throttle() decorators — both must pass for the request to proceed.
 */
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    const reqLike = req as Record<string, any> & { ips?: string[]; ip?: string };
    return reqLike.ips?.length ? reqLike.ips[0] : (reqLike.ip ?? 'unknown');
  }
}


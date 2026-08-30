import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  // Default: 60 requests per minute per IP
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(req.ips?.length ? req.ips[0] : req.ip);
  }
}

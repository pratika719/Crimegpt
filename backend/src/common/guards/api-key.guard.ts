import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard for service-to-service authentication via API key header.
 * Use this for internal endpoints (worker callbacks, warmup, etc.)
 * that don't go through user auth.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];
    const expectedKey = process.env.HEALTHCHECK_SECRET;

    if (!expectedKey) {
      // If no key is configured, allow access (dev mode)
      return true;
    }

    if (apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}

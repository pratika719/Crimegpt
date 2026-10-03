import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma';
import {
  AUTH_COOKIE_NAME,
  AUTH_SECRET_ENV_KEY,
  type AuthTokenPayload,
  type AuthUser,
} from '../auth.constants';

/**
 * Extract the JWT from either the `Authorization: Bearer` header or the
 * httpOnly `auth_token` cookie set by the OAuth callback.
 *
 * Cookie-first so browser flows work with the httpOnly cookie (Phase 8
 * "Option A" same-origin cookie model), while API clients can still use
 * Bearer tokens.
 *
 * Exported for direct unit-test coverage of the extraction rules.
 */
export function extractJwtFromCookieOrBearer(req: Request): string | null {
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice('bearer '.length).trim() || null;
  }

  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[AUTH_COOKIE_NAME] ?? null;
}

/**
 * JWT validation strategy.
 *
 * Verifies the token signature against AUTH_SECRET, then queries the DB to
 * confirm the user still exists (prevents stale tokens from working after
 * account deletion). On success attaches AuthUser to request.user.
 *
 * Fails fast at construction time when AUTH_SECRET is missing — a broken auth
 * config should crash the boot, not surface as cryptic 401s at request time.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>(AUTH_SECRET_ENV_KEY);
    if (!secret) {
      throw new Error(
        `Missing required environment variable: ${AUTH_SECRET_ENV_KEY}. ` +
          'The backend cannot authenticate requests without it.',
      );
    }

    super({
      jwtFromRequest: extractJwtFromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: AuthTokenPayload): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      this.logger.warn({ sub: payload.sub }, 'JWT references a user no longer in the DB');
      return null;
    }

    return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined };
  }
}

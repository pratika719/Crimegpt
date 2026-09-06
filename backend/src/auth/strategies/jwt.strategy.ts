import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * JWT validation strategy.
 *
 * Extracts the Bearer token from the Authorization header, verifies the
 * signature against AUTH_SECRET, then queries the DB to confirm the user
 * still exists (prevents stale tokens from working after account deletion).
 *
 * On success, attaches { id, email, name } to request.user — the same shape
 * the Google strategy returns, so @CurrentUser() works identically for both.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('AUTH_SECRET') ?? '',
    });
  }

  async validate(payload: { sub: string; email?: string; name?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      this.logger.warn({ sub: payload.sub }, 'JWT references a user no longer in the DB');
      return null;
    }

    return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined };
  }
}

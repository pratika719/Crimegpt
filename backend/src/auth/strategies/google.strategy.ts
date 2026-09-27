import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_GOOGLE_CALLBACK_URL,
  GOOGLE_CALLBACK_URL_ENV_KEY,
  GOOGLE_CLIENT_ID_ENV_KEY,
  GOOGLE_CLIENT_SECRET_ENV_KEY,
  type AuthUser,
} from '../auth.constants';

/**
 * Google OAuth 2.0 strategy.
 *
 * Used on two routes:
 *   GET /auth/google          → redirect to Google consent screen
 *   GET /auth/google/callback → exchange code, run validate(), issue JWT
 *
 * Returns the same AuthUser shape as JwtStrategy.validate() so
 * @CurrentUser() works identically regardless of how the user authenticated.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    const clientID =
      config.get<string>(GOOGLE_CLIENT_ID_ENV_KEY) ||
      config.get<string>('AUTH_GOOGLE_ID') ||
      '';
    const clientSecret =
      config.get<string>(GOOGLE_CLIENT_SECRET_ENV_KEY) ||
      config.get<string>('AUTH_GOOGLE_SECRET') ||
      '';

    const logger = new Logger(GoogleStrategy.name);
    if (!clientID || !clientSecret) {
      logger.warn(
        'Google OAuth credentials missing! Ensure GOOGLE_CLIENT_ID (or AUTH_GOOGLE_ID) and GOOGLE_CLIENT_SECRET (or AUTH_GOOGLE_SECRET) are defined in .env',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL: config.get<string>(
        GOOGLE_CALLBACK_URL_ENV_KEY,
        DEFAULT_GOOGLE_CALLBACK_URL,
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      this.logger.warn({ profileId: profile.id }, 'Google profile missing email — rejecting');
      return done(new Error('Google profile missing email'), false);
    }

    try {
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            name: profile.displayName ?? undefined,
            email,
            emailVerified: new Date(),
            image: profile.photos?.[0]?.value ?? undefined,
          },
        });
      }

      // Keep an Account record for auditability (mirrors what NextAuth's
      // PrismaAdapter did). Upsert is safe if the record already exists.
      await this.prisma.account.upsert({
        where: {
          provider_providerAccountId: { provider: 'google', providerAccountId: profile.id },
        },
        create: {
          userId: user.id,
          provider: 'google',
          type: 'oauth',
          providerAccountId: profile.id,
        },
        update: {},
      });

      const authUser: AuthUser = {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      };
      return done(null, authUser);
    } catch (err) {
      this.logger.error({ err, email }, 'Google strategy validation failed');
      return done(err as Error, false);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Google OAuth 2.0 strategy.
 *
 * Used on two routes:
 *   GET /auth/google         → triggers redirect to Google consent screen
 *   GET /auth/google/callback → exchanges the code, calls validate(), on success
 *                                request.user is set and the controller issues the JWT
 *
 * Returns the same shape as JwtStrategy.validate() so @CurrentUser() works
 * identically regardless of how the user authenticated.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? '',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:3001/auth/google/callback'),
      scope: ['email', 'profile'],
    } as const);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      this.logger.warn({ profileId: id }, 'Google profile missing email — rejecting');
      return done(new Error('Google profile missing email'), false);
    }

    try {
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            name: displayName ?? undefined,
            email,
            emailVerified: new Date(),
            image: photos?.[0]?.value ?? undefined,
          },
        });
      }

      // Keep an Account record for auditability (mirrors what NextAuth's
      // PrismaAdapter did). Upsert is safe if the record already exists.
      await this.prisma.account.upsert({
        where: {
          providerProviderAccountId: { provider: 'google', providerAccountId: id },
        },
        create: { userId: user.id, provider: 'google', type: 'oauth', providerAccountId: id },
        update: {},
      });

      return done(null, { id: user.id, email: user.email, name: user.name });
    } catch (err) {
      this.logger.error({ err, email }, 'Google strategy validation failed');
      return done(err as Error, false);
    }
  }
}

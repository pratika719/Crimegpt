import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';
import type { Profile } from 'passport-google-oauth20';
import { PrismaService } from '../prisma/prisma.service';
import {
  AUTH_COOKIE_MAX_AGE_MS,
  AUTH_COOKIE_PATH,
  DEFAULT_FRONTEND_URL,
  FRONTEND_URL_ENV_KEY,
  POST_LOGIN_REDIRECT_PATH,
  type AuthUser,
} from './auth.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates a signed JWT token for the authenticated user.
   */
  issueToken(user: AuthUser): string {
    return this.jwt.sign({ sub: user.id, email: user.email, name: user.name });
  }

  /**
   * Returns standard express cookie options for the auth token.
   */
  getCookieOptions(): CookieOptions {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
      path: AUTH_COOKIE_PATH,
    };
  }

  /**
   * Resolves the frontend redirect URL after OAuth callback.
   */
  getPostLoginRedirectUrl(success: boolean): string {
    const rawFrontendUrl = this.config.get<string>(FRONTEND_URL_ENV_KEY, DEFAULT_FRONTEND_URL);
    const frontendUrl = rawFrontendUrl.replace(/\/+$/, '');
    if (!success) {
      return `${frontendUrl}/login?error=oauth_failed`;
    }
    return `${frontendUrl}${POST_LOGIN_REDIRECT_PATH}`;
  }

  /**
   * Finds or creates a user account based on Google OAuth profile.
   */
  async validateOrCreateGoogleUser(profile: Profile): Promise<AuthUser> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      this.logger.warn({ profileId: profile.id }, 'Google profile missing email — rejecting');
      throw new Error('Google profile missing email');
    }

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

    // Keep an Account record for auditability
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

    return {
      id: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
    };
  }
}

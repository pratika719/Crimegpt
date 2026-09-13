import {
  Controller,
  Get,
  Post,
  Redirect,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  AUTH_COOKIE_MAX_AGE_MS,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_PATH,
  DEFAULT_FRONTEND_URL,
  FRONTEND_URL_ENV_KEY,
  POST_LOGIN_REDIRECT_PATH,
  type AuthUser,
} from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  // ---------------------------------------------------------------------------
  // Google OAuth initiation
  // ---------------------------------------------------------------------------
  // @UseGuards(GoogleAuthGuard) triggers passport.authenticate('google'). On the
  // initial call Passport redirects the user to Google; the handler body never
  // runs until Google redirects back (and only on success).
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Start Google OAuth flow (redirects to Google)' })
  googleInit() {
    // Handler body intentionally left empty — Passport owns the redirect flow.
  }

  // ---------------------------------------------------------------------------
  // Google OAuth callback
  // ---------------------------------------------------------------------------
  // @Redirect() turns the returned { url } into a 302. The passthrough response
  // lets us attach the httpOnly cookie to that same redirect response.
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Redirect()
  @ApiOperation({ summary: 'Google OAuth callback — issues JWT cookie and redirects' })
  googleCallback(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): { url: string } {
    if (!user) {
      throw new UnauthorizedException('Google OAuth failed');
    }

    const token = this.jwt.sign({ sub: user.id, email: user.email, name: user.name });

    res.cookie(AUTH_COOKIE_NAME, token, this.buildCookieOptions());

    const frontendUrl = this.config.get<string>(FRONTEND_URL_ENV_KEY, DEFAULT_FRONTEND_URL);
    return { url: `${frontendUrl}${POST_LOGIN_REDIRECT_PATH}` };
  }

  // ---------------------------------------------------------------------------
  // Session check / profile
  // ---------------------------------------------------------------------------
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Return the authenticated user profile' })
  getProfile(@CurrentUser() user: AuthUser) {
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }
    return { id: user.id, email: user.email, name: user.name };
  }

  // ---------------------------------------------------------------------------
  // Logout — clears the httpOnly cookie server-side.
  // The frontend should also clear any in-memory state; this endpoint ensures
  // the cookie is gone even if the browser doesn't process a JS-side clear.
  // ---------------------------------------------------------------------------
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the auth cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: AUTH_COOKIE_PATH });
    return;
  }

  /** Cookie options for the auth cookie — single definition, shared here. */
  private buildCookieOptions() {
    const secure = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
      path: AUTH_COOKIE_PATH,
    };
  }
}

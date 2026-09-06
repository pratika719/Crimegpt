import {
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; email?: string; name?: string };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  // ---------------------------------------------------------------------------
  // Google OAuth initiation
  // ---------------------------------------------------------------------------
  // The @UseGuards(AuthGuard('google')) triggers passport.authenticate('google').
  // On the initial call passport redirects the user to Google; the handler body
  // never runs until Google redirects back (and only on success).
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleInit() {
    // Handler body intentionally left empty — Passport owns the redirect flow.
  }

  // ---------------------------------------------------------------------------
  // Google OAuth callback
  // ---------------------------------------------------------------------------
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!user) {
      throw new UnauthorizedException('Google OAuth failed');
    }

    const token = this.jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      { expiresIn: '24h' as const },
    );

    const secure = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24h
      path: '/',
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return { url: `${frontendUrl}/case` };
  }

  // ---------------------------------------------------------------------------
  // Session check / profile
  // ---------------------------------------------------------------------------
  @Get('me')
  @UseGuards(AuthGuard)
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
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token', { path: '/' });
    return;
  }
}

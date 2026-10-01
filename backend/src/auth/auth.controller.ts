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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_PATH,
  type AuthUser,
} from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---------------------------------------------------------------------------
  // Google OAuth initiation
  // ---------------------------------------------------------------------------
  @Get(['google', 'signin/google'])
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Start Google OAuth flow (redirects to Google)' })
  googleInit() {
    // Handler body intentionally left empty — Passport owns the redirect flow.
  }

  // ---------------------------------------------------------------------------
  // Google OAuth callback
  // ---------------------------------------------------------------------------
  @Get(['google/callback', 'callback/google'])
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback — issues JWT cookie and redirects' })
  googleCallback(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    if (!user) {
      return res.redirect(this.authService.getPostLoginRedirectUrl(false));
    }

    const token = this.authService.issueToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, this.authService.getCookieOptions());

    return res.redirect(this.authService.getPostLoginRedirectUrl(true));
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
  // Logout
  // ---------------------------------------------------------------------------
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the auth cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: AUTH_COOKIE_PATH });
    return;
  }
}

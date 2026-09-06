import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

/**
 * GoogleAuthGuard — Passport guard for the 'google' OAuth strategy.
 *
 * Used on GET /auth/google and GET /auth/google/callback only. On the
 * initiation route it triggers the redirect to Google; on the callback route
 * it exchanges the code and attaches the user to request.user on success.
 */
@Injectable()
export class GoogleAuthGuard extends PassportAuthGuard('google') {}

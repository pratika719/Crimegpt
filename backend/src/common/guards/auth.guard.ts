import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

/**
 * AuthGuard — Passport JWT authentication.
 *
 * Extends Passport's AuthGuard for the 'jwt' strategy. On success the JWT is
 * validated, the user is queried from the DB, and { id, email, name } is
 * attached to request.user. On failure Passport throws UnauthorizedException (401).
 *
 * Controllers already use @UseGuards(AuthGuard) and @CurrentUser('id') userId —
 * this change makes that guard real without touching the controllers.
 */
@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {}


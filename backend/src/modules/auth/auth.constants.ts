/**
 * Auth module constants — single source of truth.
 *
 * Every magic value used across the auth module lives here. Strategies and the
 * controller import from this file; no hardcoded duplicates elsewhere.
 */

/** Name of the httpOnly cookie that carries the JWT after OAuth login. */
export const AUTH_COOKIE_NAME = 'auth_token';

/** JWT time-to-live. Re-issued on every Google OAuth callback. */
export const AUTH_TOKEN_TTL = '24h';

/** Cookie maxAge in ms — must match AUTH_TOKEN_TTL. */
export const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/** Cookie path scope. */
export const AUTH_COOKIE_PATH = '/';

/** Frontend URL used when AUTH/FRONTEND_URL is unset (dev default). */
export const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

/** OAuth callback URL used when GOOGLE_CALLBACK_URL is unset (dev default). */
export const DEFAULT_GOOGLE_CALLBACK_URL = 'http://localhost:3001/api/auth/google/callback';

/** Path on the frontend the user lands on after successful login. */
export const POST_LOGIN_REDIRECT_PATH = '/case';

/** Cookie secret source — shared with the legacy NextAuth deployment. */
export const AUTH_SECRET_ENV_KEY = 'AUTH_SECRET';

/** OAuth client credentials env keys. */
export const GOOGLE_CLIENT_ID_ENV_KEY = 'GOOGLE_CLIENT_ID';
export const GOOGLE_CLIENT_SECRET_ENV_KEY = 'GOOGLE_CLIENT_SECRET';
export const GOOGLE_CALLBACK_URL_ENV_KEY = 'GOOGLE_CALLBACK_URL';
export const FRONTEND_URL_ENV_KEY = 'FRONTEND_URL';

/** Environment keys needed by the auth module at boot (fail-fast check). */
export const REQUIRED_AUTH_ENV_KEYS = [
  AUTH_SECRET_ENV_KEY,
  GOOGLE_CLIENT_ID_ENV_KEY,
  GOOGLE_CLIENT_SECRET_ENV_KEY,
] as const;

/**
 * JWT payload shape shared by both strategies and the token issuer.
 * `sub` holds the Prisma User.id.
 */
export interface AuthTokenPayload {
  sub: string;
  email?: string;
  name?: string;
}

/** Canonical request.user shape produced by every auth strategy. */
export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

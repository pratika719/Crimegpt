import { PrismaService } from '@/common/prisma';
import { JwtStrategy, extractJwtFromCookieOrBearer } from './jwt.strategy';
import { AUTH_COOKIE_NAME } from '../auth.constants';

// @nestjs/passport ships ESM-only builds that jest's CJS pipeline cannot load.
// These tests exercise validate() and the extractor via the prototype, never
// Passport registration, so a stub base class is sufficient here.
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: () => class {},
}));

/**
 * Build a JwtStrategy with mocked ConfigService/PrismaService, bypassing the
 * PassportStrategy base-class super() call via prototype patching. Passport
 * strategies are hard to instantiate directly in tests (they register with
 * passport on construction), so we grab the prototype methods directly.
 */
function buildStrategy(overrides?: { user?: unknown }) {
  const findUnique = jest.fn().mockResolvedValue(overrides?.user ?? null);

  const strategy = Object.create(JwtStrategy.prototype) as JwtStrategy;
  Object.assign(strategy, {
    prisma: { user: { findUnique } } as unknown as PrismaService,
    logger: { warn: jest.fn() },
  });

  return { strategy, findUnique };
}

describe('extractJwtFromCookieOrBearer', () => {
  it('extracts a Bearer token from the Authorization header', () => {
    const req = { headers: { authorization: 'Bearer abc.def.ghi' }, cookies: {} } as never;
    expect(extractJwtFromCookieOrBearer(req)).toBe('abc.def.ghi');
  });

  it('is case-insensitive on the Bearer scheme', () => {
    const req = { headers: { authorization: 'bearer abc.def.ghi' }, cookies: {} } as never;
    expect(extractJwtFromCookieOrBearer(req)).toBe('abc.def.ghi');
  });

  it('falls back to the auth cookie when no Authorization header is present', () => {
    const req = {
      headers: {},
      cookies: { [AUTH_COOKIE_NAME]: 'cookie.jwt.value' },
    } as never;
    expect(extractJwtFromCookieOrBearer(req)).toBe('cookie.jwt.value');
  });

  it('returns null when neither a Bearer header nor cookie is present', () => {
    const req = { headers: {}, cookies: {} } as never;
    expect(extractJwtFromCookieOrBearer(req)).toBeNull();
  });

  it('returns null when there is no Bearer header and cookies are missing entirely', () => {
    const req = { headers: {} } as never;
    expect(extractJwtFromCookieOrBearer(req)).toBeNull();
  });

  it('prefers the Bearer header over the cookie when both are present', () => {
    const req = {
      headers: { authorization: 'Bearer header.jwt.token' },
      cookies: { [AUTH_COOKIE_NAME]: 'cookie.jwt.value' },
    } as never;
    expect(extractJwtFromCookieOrBearer(req)).toBe('header.jwt.token');
  });
});

describe('JwtStrategy.validate', () => {
  it('returns the AuthUser when the user exists', async () => {
    const { strategy, findUnique } = buildStrategy({
      user: { id: 'u1', email: 'officer@agency.gov', name: 'Officer' },
    });

    const result = await strategy.validate({ sub: 'u1' });

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(result).toEqual({
      id: 'u1',
      email: 'officer@agency.gov',
      name: 'Officer',
    });
  });

  it('returns null (→ 401) when the user no longer exists in the DB', async () => {
    const { strategy, findUnique } = buildStrategy({ user: null });

    const result = await strategy.validate({ sub: 'deleted-user' });

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'deleted-user' } });
    expect(result).toBeNull();
  });
});

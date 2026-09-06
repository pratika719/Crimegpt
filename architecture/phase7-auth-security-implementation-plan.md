# Phase 7: Auth & Security — NestJS Migration Implementation Plan

> **Goal:** Migrate from NextAuth v5 → Passport.js + JWT in NestJS. Replace dev-mode `x-user-id` header auth with a real JWT strategy backed by the existing Prisma `User`/`Account`/`Session` models. Introduce Google OAuth support and production-grade rate limiting via `@nestjs/throttler`. Add a `PromptSecurityInterceptor` for AI endpoints.

---

## 0. Pre-Flight Check: Current State

### What already exists

| Artifact | Status | Notes |
|---|---|---|
| `backend/src/auth/auth.module.ts` | Skeleton | `@Module({})` — empty |
| `backend/src/common/guards/auth.guard.ts` | Placeholder | Extracts `x-user-id` header; throws `UnauthorizedException` if missing |
| `backend/src/common/guards/throttler.guard.ts` | Ready | Extends `ThrottlerGuard`, tracks IP |
| `backend/src/common/guards/api-key.guard.ts` | Ready | `x-api-key` header vs `HEALTHCHECK_SECRET` |
| `backend/src/common/interceptors/transform.interceptor.ts` | Ready | Wraps responses in `{ success, data, timestamp }` |
| `backend/src/common/filters/all-exceptions.filter.ts` | Ready | Catches all exceptions, returns structured error |
| `backend/src/common/decorators/current-user.decorator.ts` | Ready | `createParamDecorator` reads `request.user` |
| `backend/src/app.module.ts` | Ready | `ThrottlerModule.forRoot({ ttl: 60000, limit: 60 })` already configured; `APP_GUARD: RateLimitGuard` registered |
| `backend/src/case/case.module.ts` | Ready | `CasesController`, `PersonsController`, `EvidenceController`, `DocumentsController`, `JobsController` all use `@UseGuards(AuthGuard)` |
| Prisma schema (`User`, `Account`, `Session`) | Ready | Same models NextAuth uses — Passport/JWT can reuse them |
| `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | In `.env.example` | Already defined |

### What the Next.js app currently does (for reference)

- **Auth:** NextAuth v5 with Google provider, JWT session strategy, 24h session, PrismaAdapter
- **Action guard:** `requireUser()` calls `auth()` and returns `session.user.id` or throws `UnauthorizedError`
- **Rate limit:** `checkRateLimit()` uses Redis INCR/EXPIRE directly; only `document-generation.action.ts` uses it (5 req / 10 min per user)
- **Prompt security:** `PROMPT_SECURITY_INSTRUCTIONS` string prepended to every prompt

### What Phase 7 must deliver

1. **JWT authentication** — replace the `x-user-id` dev hack with a real JWT strategy
2. **Google OAuth** — bridge the existing `AUTH_GOOGLE_ID/SECRET` into a Passport GoogleStrategy
3. **Auth endpoints** — `POST /auth/login` (credential or OAuth initiation), `GET /auth/google/callback`, `POST /auth/logout`
4. **JWT guards on all controllers** — replace the placeholder `AuthGuard` with a real one
5. **Rate limiting migration** — move from manual Redis calls to `@nestjs/throttler` decorators
6. **PromptSecurityInterceptor** — move `PROMPT_SECURITY_INSTRUCTIONS` out of prompts and into a middleware/interceptor layer

---

## 1. New Dependencies

```bash
cd backend && npm install @nestjs/passport passport @nestjs/jwt passport-jwt passport-google-oauth20 jsonwebtoken && npm install -D @types/passport-jwt @types/passport-google-oauth20 @types/jsonwebtoken
```

| Package | Why |
|---|---|
| `@nestjs/passport` + `passport` | Strategy/guard infrastructure |
| `@nestjs/jwt` + `jsonwebtoken` | JWT token creation + verification |
| `passport-jwt` | JWT extraction strategy |
| `passport-google-oauth20` | Google OAuth 2.0 strategy |
| `@types/passport-jwt`, `@types/passport-google-oauth20`, `@types/jsonwebtoken` | Type definitions |

`passport-local` is **not** needed unless you add email/password login. Phase 7 keeps Google OAuth as the only login path to match the existing app; add local later if needed.

---

## 2. Module Structure

```
backend/src/auth/
├── auth.module.ts                  # Populated — imports PassportModule, JwtModule
├── auth.controller.ts              # POST /auth/login, GET /auth/google, GET /auth/google/callback, POST /auth/logout
├── strategies/
│   ├── jwt.strategy.ts             # Passport JWT strategy — verifies Bearer token, loads User from DB
│   └── google.strategy.ts         # Passport GoogleStrategy — handles OAuth callback, creates/finds User
├── guards/
│   └── auth.guard.ts              # REPLACES placeholder — uses Passport AuthGuard('jwt')
├── decorators/
│   └── current-user.decorator.ts # Already exists — no change needed
└── dto/
    ├── login.dto.ts              # Optional: if adding credential login later
    └── google-login.dto.ts       # Optional: Google OAuth initiation request
```

---

## 3. JWT Strategy

`backend/src/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('AUTH_SECRET'),
    });
  }

  async validate(payload: { sub: string; email?: string; name?: string }) {
    // Verify the user still exists (revoked accounts shouldn't get fresh tokens)
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      this.logger.warn({ sub: payload.sub }, 'JWT user not found in DB — token may be stale');
      return null; // Passport will treat this as 401
    }
    return { id: user.id, email: user.email, name: user.name };
  }
}
```

**Key decisions:**

- `secretOrKey` from `AUTH_SECRET` — same secret the Next.js app uses for its JWT sessions. If you want to rotate, do it at deploy time and accept that existing tokens expire within their 24h window.
- `validate()` queries the DB to confirm the user exists. This is a small cost (one prisma query per request) but prevents stale tokens from working after account deletion. If you want to skip the DB lookup for latency, remove it and rely on short token TTLs — but then you can't revoke access before expiry. For this app, the DB lookup is worth it.
- Returns `{ id, email, name }` — this becomes `request.user` and is what `@CurrentUser()` reads.

---

## 4. Google OAuth Strategy

`backend/src/auth/strategies/google.strategy.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:3000/auth/google/callback'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, emails, displayName } = profile;
    const email = emails?.[0]?.value;
    if (!email) {
      return done(new Error('Google profile missing email'), false);
    }

    try {
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Create user — NextAuth's PrismaAdapter does the same
        user = await this.prisma.user.create({
          data: {
            name: displayName ?? undefined,
            email,
            emailVerified: new Date(),
            image: profile.photos?.[0]?.value ?? undefined,
          },
        });
      }

      // Optionally create Account record for audit/troubleshooting
      // (not strictly required — JWT handles auth; Account is for OAuth relationship tracking)
      await this.prisma.account.upsert({
        where: { providerProviderAccountId: { provider: 'google', providerAccountId: id } },
        create: { userId: user.id, provider: 'google', type: 'oauth', providerAccountId: id },
        update: {},
      });

      return done(null, { id: user.id, email: user.email, name: user.name });
    } catch (err) {
      this.logger.error({ err, email }, 'Google strategy validation failed');
      return done(err, false);
    }
  }
}
```

**Key decisions:**

- Reuses the existing `User` model exactly as NextAuth's PrismaAdapter did — no schema change needed.
- Creates an `Account` record for auditability (matches what PrismaAdapter did). Optional but useful for troubleshooting OAuth issues.
- If the user doesn't exist, creates one with `emailVerified: new Date()`. This matches NextAuth's behavior for Google (which verifies email).
- Returns the same shape as `JwtStrategy.validate()` so both strategies populate `request.user` identically.

---

## 5. Auth Controller

`backend/src/auth/auth.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Redirect,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { AuthGuard } from './guards/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // -----------------------------------------------------------------------
  // Google OAuth initiation
  // -----------------------------------------------------------------------
  @Get('google')
  @Redirect()
  googleLogin(@Req() req: Request) {
    // Passport will redirect to Google; the @Redirect() decorator lets
    // Express handle the 302. We use the guard to trigger the strategy.
    // Actually: use a dedicated route handler that passport authenticates.
    // See note below about passport-integration.
    return { url: `/auth/google/callback` }; // placeholder — see implementation note
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @Redirect()
  googleCallback(
    @CurrentUser() user: { id: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // After successful Google OAuth, issue a JWT and redirect to the frontend
    const token = this.jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      { expiresIn: '24h' },
    );

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24h
      path: '/',
    });

    return { url: `${frontendUrl}/case` };
  }

  // -----------------------------------------------------------------------
  // Token refresh / session check
  // -----------------------------------------------------------------------
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@CurrentUser() user: { id: string; email?: string; name?: string }) {
    return { id: user.id, email: user.email, name: user.name };
  }

  // -----------------------------------------------------------------------
  // Logout — clears the cookie on the backend
  // Note: the frontend must also clear its storage; this endpoint
  // provides server-side session invalidation if you add a token blocklist.
  // -----------------------------------------------------------------------
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token', { path: '/' });
    return;
  }
}
```

**Implementation note for Google OAuth redirect chain:**

Passport's OAuth strategies work via `@UseGuards(AuthGuard('google'))` which triggers the `authenticate('google')` flow. The redirect to Google happens inside Passport, not in your controller. The correct pattern is:

1. `GET /auth/google` — controller does **nothing** except `@UseGuards(AuthGuard('google'))`. The guard calls `passport.authenticate('google')` which redirects the user to Google. You can't `@Redirect()` here because Passport does the redirect internally.

Actually, the cleanest NestJS pattern is:

```typescript
@Get('google')
@UseGuards(AuthGuard('google'))
googleInit() {
  // This method body never runs — Passport redirects to Google first.
  // If the user is already authenticated, Passport calls this after redirect.
  // But on first call, Passport sends the 302 to Google before this runs.
}
```

Wait — that's not right either. Let me be precise:

In NestJS + Passport, `@UseGuards(AuthGuard('google'))` on a route means: when that route is hit, run `passport.authenticate('google')`. For OAuth strategies, `passport.authenticate('google')` does two things depending on the request:

- **If it's the initial call (no OAuth code in URL):** redirect to Google
- **If it's the callback (Google redirects back with `code`):** exchange the code, call `verify`, and on success redirect to the `callbackURL` with the user

So the actual pattern that works:

```typescript
@Get('google')
@UseGuards(AuthGuard('google'))
@Redirect()
googleInit() {
  // Empty — Passport handles the redirect
  // If you want to redirect to a specific frontend URL after Google redirects back,
  // that's handled in the callback route.
}
```

Wait — no. The `@UseGuards(AuthGuard('google'))` on the `/google` route means: when someone hits `/auth/google`, run the Google strategy. The Google strategy (passport-google-oauth20) will redirect the user to Google's consent screen. When Google redirects back to `callbackURL` (which is `/auth/google/callback`), the `/auth/google/callback` route is hit with the `code` parameter. THAT route also uses `@UseGuards(AuthGuard('google'))` which runs the strategy again, this time with the code, and the strategy's `verify` callback fires. On success, Passport attaches the user to `request.user` and the controller handler runs.

So the two routes are:

```
GET /auth/google           → @UseGuards(AuthGuard('google'))  → Passport redirects to Google
GET /auth/google/callback  → @UseGuards(AuthGuard('google'))  → Passport exchanges code, calls verify,
                                                              → on success: request.user is set, handler runs
```

This is correct. Let me rewrite the controller properly:

```typescript
@Controller('auth')
export class AuthController {
  // ...

  @Get('google')
  @UseGuards(AuthGuard('google'))
  // No decorator needed — Passport sends the 302 to Google.
  // The route handler body never executes for the initial call.
  googleInit() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @CurrentUser() user: { id: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.jwt.sign(
      { sub: user.id, email: (user as any).email, name: (user as any).name },
      { expiresIn: '24h' },
    );
    res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 24*60*60*1000 });
    return { url: this.config.get('FRONTEND_URL', 'http://localhost:3000') };
  }
}
```

The `@CurrentUser()` decorator will now return the user object that the Google strategy's `verify` callback passed to `done(null, user)`.

---

## 6. Auth Guard (Replace Placeholder)

`backend/src/common/guards/auth.guard.ts` — **full rewrite**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  // Extends Passport's AuthGuard for the 'jwt' strategy.
  // On failure, Passport throws UnauthorizedException (401) automatically.
  // No custom logic needed unless you want to customize the error response.
  // If you want a custom 401 message, override handleRequest:
  //
  // handleRequest(err: any, user: any, info: any) {
  //   if (err || !user) {
  //     throw new UnauthorizedException('Authentication required');
  //   }
  //   return user;
  // }
}
```

This single change converts every controller that uses `@UseGuards(AuthGuard)` from "accepts `x-user-id` header" to "requires a valid `Authorization: Bearer <token>` header with a JWT signed by `AUTH_SECRET`".

**No changes needed to controllers** — they already use `@UseGuards(AuthGuard)` and `@CurrentUser('id') userId`. After this rewrite, `AuthGuard` extracts the JWT, validates it, queries the DB to confirm the user exists, and attaches `{ id, email, name }` to `request.user`. `@CurrentUser('id')` reads `request.user.id` just as before.

---

## 7. JwtModule + AuthModule Wiring

`backend/src/auth/auth.module.ts` — **populate from skeleton**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('AUTH_SECRET'),
        signOptions: { expiresIn: '24h' as const },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, GoogleStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
```

**Why `JwtModule` is exported:** Other modules (e.g., `CaseModule`, `DocumentModule`) may want to issue JWTs for service-to-service calls or for the `ProgressTrackerService` to embed in job-status webhook URLs. Exporting `JwtModule` lets them inject `JwtService` without re-registering it.

**Why `PassportModule` is exported:** Any module that wants to use `@UseGuards(AuthGuard('google'))` or another custom strategy needs `PassportModule` imported. Exporting it from `AuthModule` means `AppModule` imports `AuthModule` once and everything has Passport available.

---

## 8. Update `AppModule`

`backend/src/app.module.ts` — add `AuthModule` to imports (it's already there as a skeleton; just ensure it's wired)

Current `AppModule` already imports `AuthModule`. No change needed to the import list. The only thing to verify: `AuthModule` must be imported **after** `ConfigModule` (which it is, since `ConfigModule` is registered first and `AuthModule`'s `JwtModule.registerAsync` injects `ConfigService`).

No change to `AppModule` needed.

---

## 9. Rate Limiting Migration

### Current state

- `ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] })` is in `AppModule`
- `RateLimitGuard` (extends `ThrottlerGuard`) is registered as `APP_GUARD`
- The only place `checkRateLimit` (manual Redis) is used is `document-generation.action.ts`: 5 requests per 10 minutes per user

### Problem

The global `RateLimitGuard` applies 60 req/min/IP to **every** endpoint. That's fine for the API surface generally, but document generation needs a **per-user, per-action** limit that's tighter (5/10min) and keyed by user ID, not IP.

### Solution: Two-tier rate limiting

**Tier 1 — Global IP-based (already in place):**
- `ThrottlerModule` + `RateLimitGuard` as `APP_GUARD`
- 60 req/min per IP for all endpoints
- No changes needed

**Tier 2 — Per-user action-specific (new):**
- Use `@Throttle({ ttl: 600_000, limit: 5 })` on the document-generation endpoint in `DocumentsController`
- Key by user ID extracted from JWT, not IP

The `@nestjs/throttler` `Throttle` decorator supports a custom key extractor. To key by user ID instead of IP, we need a custom `ThrottlerGuard` that uses `request.user.id` when available:

```typescript
// backend/src/common/guards/throttler.guard.ts — update
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: ThrottlerRequest): Promise<string> {
    // Prefer user ID (from JWT) for per-user rate limits;
    // fall back to IP for unauthenticated endpoints
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}
```

**But there's a subtlety:** If we key the global guard by user ID, then unauthenticated requests (which don't have `request.user`) would all key by IP — which is fine. And authenticated requests would key by user ID. The global 60/min limit would then be 60/min per user, which is generous enough.

However, the document generation endpoint needs a **separate, tighter** limit (5/10min). We can layer decorators:

```typescript
@Controller('cases')
export class DocumentsController {
  @Post(':id/documents/generate')
  @Throttle({ ttl: 600_000, limit: 5 }) // 5 per 10 minutes per user
  async generate(@CurrentUser('id') userId: string, @Param('id') caseId: string, @Body() dto: GenerateDocDto) {
    // ...
  }
}
```

With the updated `RateLimitGuard.getTracker()` returning `user:<id>`, the `@Throttle` decorator's limit applies per-user. The global 60/min still applies on top (enforced by the `APP_GUARD` at a higher level).

**Wait — ordering:** NestJS applies guards in this order: `APP_GUARD`s first (global), then controller-level guards, then method-level guards. Throttler guards work by intercepting the request before the handler runs. If we have both the global `RateLimitGuard` (60/min) and the `@Throttle(5/10min)` on the method, both will run. The global one checks 60/min/Ip-or-user, the method one checks 5/10min/user. If either fails, the request is rejected. This is the correct behavior — the tighter limit is the effective one, and the global limit provides a safety net.

**Decisions:**

- Keep the global `RateLimitGuard` as `APP_GUARD` but update `getTracker()` to prefer `request.user.id`
- Add `@Throttle({ ttl: 600_000, limit: 5 })` to `DocumentsController.generate()` (and any other AI-generation endpoints that need per-user limits)
- Remove the manual `checkRateLimit` Redis call from `document-generation.action.ts` once the action is migrated to a NestJS controller (Phase 8)

---

## 10. Prompt Security Interceptor

### Current state

`PROMPT_SECURITY_INSTRUCTIONS` is a string constant in `src/lib/security/prompt-security.ts`. It's prepended to every prompt in `DocumentGeneratorService`. This is:

1. **Inefficient** — adds ~50 tokens to every Gemini call
2. **Not ideal for security** — user content in the prompt can theoretically override prepended instructions (prompt injection). Gemini's `systemInstruction` parameter is harder to override.

### Plan

Move `PROMPT_SECURITY_INSTRUCTIONS` into `GeminiService` as a `systemInstruction` parameter passed to `genAI.getGenerativeModel({ systemInstruction, ... })`. This is already recommended in the Phase 5 plan (see the "Prompt Security Instructions" section in the updated `phase5-ai-rag-implementation-plan.md`).

In addition, add an optional `PromptSecurityInterceptor` that validates prompt inputs before they reach AI endpoints. This is a defense-in-depth measure:

```typescript
// backend/src/common/interceptors/prompt-security.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class PromptSecurityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // This interceptor runs BEFORE the handler. It can inspect the request body
    // for suspicious patterns and reject early.
    // For now, it's a placeholder that logs and passes through.
    // The real security comes from moving PROMPT_SECURITY_INSTRUCTIONS to
    // Gemini's systemInstruction (in GeminiService).
    return next.handle();
  }
}
```

**Decision:** The `PromptSecurityInterceptor` is lower priority. The high-impact change is moving `PROMPT_SECURITY_INSTRUCTIONS` to `systemInstruction` in `GeminiService`. That's a Phase 5 change, not Phase 7. For Phase 7, we just note it and optionally scaffold the interceptor.

**What Phase 7 actually does for prompt security:**

- Add the `PromptSecurityInterceptor` skeleton to `backend/src/common/interceptors/` (empty implementation, logged as TODO)
- Document that `GeminiService` should use `systemInstruction` instead of prepending the string (this is implemented in Phase 5 already, per the updated plan)

---

## 11. Error Handling for Auth Failures

The `AllExceptionsFilter` already catches `HttpException` and returns structured errors. `UnauthorizedException` (thrown by Passport on JWT failure) maps to 401. This is correct.

However, the current filter returns `{ statusCode, timestamp, path, method, message, error }`. For auth failures, we want a consistent shape that the frontend can parse. Let's add an auth-specific error format:

Actually, the current filter already handles this. If Passport throws `UnauthorizedException('JWT strategy failed')`, the filter catches it, returns 401 with the message. The frontend's API client can check `statusCode === 401` and redirect to login. This is fine.

**No changes to `AllExceptionsFilter` needed.**

---

## 12. Files to Create

| # | File Path | Purpose |
|---|---|---|
| 1 | `backend/src/auth/auth.controller.ts` | Login, Google OAuth callback, /me, logout |
| 2 | `backend/src/auth/strategies/jwt.strategy.ts` | JWT extraction + validation + DB user check |
| 3 | `backend/src/auth/strategies/google.strategy.ts` | Google OAuth strategy + user create/find + Account upsert |
| 4 | `backend/src/common/interceptors/prompt-security.interceptor.ts` | Skeleton (optional; real work is in GeminiService) |

## Files to Modify

| # | File Path | Change |
|---|---|---|
| 1 | `backend/src/auth/auth.module.ts` | Populate skeleton: add PassportModule, JwtModule, controller, strategies |
| 2 | `backend/src/auth/auth.module.ts` | Export JwtModule + PassportModule |
| 3 | `backend/src/common/guards/auth.guard.ts` | Replace placeholder with `extends PassportAuthGuard('jwt')` |
| 4 | `backend/src/common/guards/throttler.guard.ts` | Update `getTracker()` to prefer `request.user.id` |
| 5 | `backend/src/queue/job-types.ts` (already modified) | No auth change needed — job payloads are service-to-service |
| 6 | `backend/package.json` | Add `@nestjs/passport`, `passport`, `@nestjs/jwt`, `passport-jwt`, `passport-google-oauth20`, `jsonwebtoken`; add type devDeps |
| 7 | `backend/.env.example` | Already has `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — add `FRONTEND_URL` and `GOOGLE_CALLBACK_URL` |

## Files to Delete

| # | File Path | Reason |
|---|---|---|
| 1 | None yet | The placeholder `auth.guard.ts` is rewritten, not deleted |

---

## 13. Dependency Graph

```
AppModule
├── ConfigModule (global)
├── ThrottlerModule (global, 60/min/IP)
├── AuthModule
│   ├── PassportModule (exported)
│   ├── JwtModule.registerAsync (exported)
│   ├── AuthController
│   │   ├── GET /auth/google         → @UseGuards(AuthGuard('google'))  → Passport redirects to Google
│   │   ├── GET /auth/google/callback → @UseGuards(AuthGuard('google')) → exchange code, issue JWT cookie
│   │   ├── GET /auth/me             → @UseGuards(AuthGuard('jwt'))      → return user profile
│   │   └── POST /auth/logout        → clear auth_token cookie
│   ├── JwtStrategy (validates Bearer token, queries User)
│   └── GoogleStrategy (OAuth callback, creates/finds User, upserts Account)
├── CaseModule
│   ├── CasesController        → @UseGuards(AuthGuard)  (now uses real JWT)
│   ├── PersonsController      → @UseGuards(AuthGuard)
│   ├── EvidenceController     → @UseGuards(AuthGuard)
│   ├── DocumentsController    → @UseGuards(AuthGuard) + @Throttle(5/10min) on generate
│   └── JobsController         → @UseGuards(AuthGuard)
└── ...

request flow (authenticated):
  1. Request arrives with Authorization: Bearer <jwt>
  2. RateLimitGuard (global): checks 60/min per user ID (from JWT)
  3. AuthGuard (method-level, via @UseGuards): Passport extracts JWT, validates signature,
     calls JwtStrategy.validate() which queries DB for user, attaches { id, email, name } to request.user
  4. @CurrentUser('id') extracts request.user.id
  5. Handler runs
  6. If handler throws UnauthorizedException, AllExceptionsFilter returns 401

request flow (unauthenticated, e.g., health check):
  1. Request arrives without Authorization header
  2. RateLimitGuard: keys by IP (no user.id)
  3. AuthGuard: Passport throws UnauthorizedException (401)
  4. If the endpoint doesn't use @UseGuards(AuthGuard), it proceeds without auth
```

---

## 14. Environment Variables

Add to `backend/.env.example`:

```
# Auth
AUTH_SECRET=your-auth-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth callback URL (where Google redirects back after consent)
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Frontend URL (where the user is redirected after login)
FRONTEND_URL=http://localhost:3000
```

`AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` already exist. `GOOGLE_CALLBACK_URL` and `FRONTEND_URL` are new.

**`GOOGLE_CALLBACK_URL` note:** The callback URL must match what's registered in the Google Cloud Console for the OAuth client. For development, it's `http://localhost:3000/auth/google/callback`. For production, it's `https://<your-domain>/auth/google/callback`. Each environment needs its own OAuth client (or at least its own authorized redirect URI).

---

## 15. Implementation Order

### Step 1: Install dependencies
```bash
cd backend && npm install @nestjs/passport passport @nestjs/jwt passport-jwt passport-google-oauth20 jsonwebtoken && npm install -D @types/passport-jwt @types/passport-google-oauth20 @types/jsonwebtoken
```

### Step 2: Create JWT strategy
`backend/src/auth/strategies/jwt.strategy.ts`

### Step 3: Create Google strategy
`backend/src/auth/strategies/google.strategy.ts`

### Step 4: Rewrite AuthGuard
`backend/src/common/guards/auth.guard.ts` — replace placeholder

### Step 5: Update ThrottlerGuard
`backend/src/common/guards/throttler.guard.ts` — prefer `request.user.id`

### Step 6: Create AuthController
`backend/src/auth/auth.controller.ts`

### Step 7: Populate AuthModule
`backend/src/auth/auth.module.ts`

### Step 8: Scaffold PromptSecurityInterceptor (optional)
`backend/src/common/interceptors/prompt-security.interceptor.ts`

### Step 9: Update .env.example
Add `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`

### Step 10: Add rate limit decorator to DocumentsController
`backend/src/case/controllers/documents.controller.ts` — `@Throttle({ ttl: 600_000, limit: 5 })` on generate endpoint

### Step 11: Verify
- `npx tsc --noEmit` passes
- `npm run test` (if tests exist) passes
- Manual test: start backend, hit `GET /auth/google`, verify redirect to Google (will fail without valid OAuth credentials, but the redirect chain should begin)
- Manual test: post a JWT to `GET /auth/me`, verify it returns the user profile
- Manual test: call a case endpoint with a valid JWT, verify it works; without JWT, verify 401

---

## 16. What This Phase Does NOT Do

- **Does not add email/password login** — Phase 7 only adds Google OAuth + JWT. Local credential login is a future enhancement if needed.
- **Does not build a token blocklist/revocation list** — JWTs expire in 24h. If you need immediate revocation (e.g., user bans), add a Redis blocklist in a later phase.
- **Does not add refresh tokens** — The 24h JWT is re-issued on each Google OAuth callback. For a smoother UX without re-redirecting to Google every 24h, add a refresh token flow later.
- **Does not change the frontend** — Phase 8 handles the frontend cutover. Phase 7 only builds the backend auth endpoints. The frontend still uses NextAuth until Phase 8.
- **Does not remove NextAuth from the Next.js app** — That's Phase 8.
- **Does not implement the PromptSecurityInterceptor fully** — It's a skeleton. The real work (moving `PROMPT_SECURITY_INSTRUCTIONS` to `systemInstruction`) is in Phase 5 / Phase 9.

---

## 17. Migration Checklist

- [ ] `@nestjs/passport`, `passport`, `@nestjs/jwt`, `passport-jwt`, `passport-google-oauth20`, `jsonwebtoken` installed in `backend/package.json`
- [ ] Type dev dependencies (`@types/passport-jwt`, etc.) installed
- [ ] `JwtStrategy` validates JWT from `Authorization: Bearer` header, queries DB for user
- [ ] `GoogleStrategy` handles OAuth callback, creates/finds User, upserts Account
- [ ] `AuthGuard` extends `PassportAuthGuard('jwt')` — no more `x-user-id` header
- [ ] `AuthController` has `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout`
- [ ] `/auth/google/callback` issues a JWT and sets `auth_token` cookie
- [ ] `AuthModule` exports `JwtModule` and `PassportModule`
- [ ] `ThrottlerGuard.getTracker()` prefers `request.user.id`
- [ ] `DocumentsController.generate()` has `@Throttle({ ttl: 600_000, limit: 5 })`
- [ ] `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are in `.env.example`
- [ ] `GOOGLE_CALLBACK_URL` and `FRONTEND_URL` added to `.env.example`
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No circular dependency warnings
- [ ] All existing controllers still work with `@UseGuards(AuthGuard)` (now using real JWT)

---

## 18. Security Considerations

| Concern | Mitigation |
|---|---|
| JWT theft via XSS | `auth_token` cookie is `httpOnly: true`, `sameSite: 'lax'` — JS cannot read it. Frontend stores nothing. |
| JWT reuse after account deletion | `JwtStrategy.validate()` queries DB — deleted users get 401 even with a valid token. |
| Google OAuth redirect abuse | `callbackURL` is hardcoded in strategy config; Google only redirects to registered URIs. |
| Brute force on JWT | 24h expiry + no password to brute force (OAuth only). Rate limiting on `/auth/me` can be added if needed. |
| Prompt injection | `PROMPT_SECURITY_INSTRUCTIONS` moved to Gemini `systemInstruction` (Phase 5/9). The `PromptSecurityInterceptor` skeleton is placeholder defense-in-depth. |
| Service-to-service auth | Worker processes and internal endpoints use `x-api-key` header + `ApiKeyGuard` (already in place). Not changed in Phase 7. |

---

## 19. Relationship to Other Phases

| Phase | Interaction |
|---|---|
| Phase 3 (Case domain) | Case controllers already use `@UseGuards(AuthGuard)` — Phase 7 makes that guard real |
| Phase 4 (Document generation) | `DocumentsController.generate()` needs the per-user `@Throttle` decorator from Phase 7 |
| Phase 5 (AI/RAG) | `GeminiService` should use `systemInstruction` for prompt security — Phase 7 documents this but doesn't implement it |
| Phase 6 (Workers) | Workers use `x-api-key` + `ApiKeyGuard` — not affected by Phase 7 |
| Phase 8 (Frontend cutover) | Frontend switches from NextAuth to calling `POST /auth/google` + storing the JWT cookie — Phase 7 builds the endpoints Phase 8 consumes |
| Phase 9 (Observability) | May add token blocklist, refresh tokens, and audit logging for auth events |

---

*End of Phase 7 plan.*

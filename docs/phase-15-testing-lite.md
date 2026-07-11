# Phase 15 — Testing Lite

## Goal

Add a small but meaningful test suite covering the most critical backend and platform helper logic in CrimeGPT v2. The goal is to **prevent regressions** in deterministic, pure helper modules — not to achieve 100% coverage or replace manual testing of AI/database flows.

---

## Test Strategy

Test only logic that is:
- Deterministic and fast to run without I/O
- Critical infrastructure (cache hashing, job ID safety, rate limiting, error classification)
- Independently testable via mocks (AI observability, rate limiter)

Do not test:
- Real Gemini API calls
- Real FastAPI embedding service calls
- Real Neon/PostgreSQL queries
- Real Upstash/Redis connections
- Next.js Server Actions (integration layer)
- UI rendering

---

## What We Test

| Module | What is Tested |
|---|---|
| `cache-hash.ts` | Key-order independence, different inputs → different hashes, array ordering, hex format |
| `cache-keys.ts` | Correct prefixes, user/case scoping, all exported key factories |
| `job-id.ts` | Colon replacement, separator joining, special char sanitization, null/undefined filtering |
| `retryable-error.ts` | Error class properties, all keyword branches in `isRetryableError` |
| `rate-limit.ts` | Allow/block logic, expire-on-first-call, TTL fallback to windowSeconds |
| `worker-concurrency.ts` | Env parsing, integer validation, fallback for bad values (0, negative, float, NaN) |
| `health.service.ts` | `getOverallStatus` for all ok/degraded/failed combinations |
| `ai-observability.service.ts` | SUCCESS/FAILED status, failure reason truncation, repository failure resilience |
| `prompt-security.ts` | Guardrail text existence checks |

---

## What We Intentionally Do Not Test

- Real external service calls (Gemini, FastAPI, Neon, Upstash)
- Next.js Server Actions (require real HTTP layer)
- BullMQ processor logic (requires mocking complex job objects)
- Prisma repository methods (require real DB or complex mocking)
- UI components (no React Testing Library installed)
- Full integration flows (document generation end-to-end)

---

## Test Stack

- **Test runner**: [Vitest](https://vitest.dev/) v4.x
- **Mocking**: Vitest built-in `vi.mock`, `vi.fn`, `vi.resetModules`
- **Assertions**: Vitest `expect` with standard matchers
- **Environment**: Node (no JSDOM)
- **Path aliases**: `@/` resolves to `src/` via Vitest `resolve.alias`

---

## Test Files

```
vitest.config.ts                                    ← Vitest config with Node env + path alias
src/test/setup.ts                                   ← Global afterEach: clearAllMocks + restoreAllMocks

src/lib/cache/cache-hash.test.ts                    ← 5 tests
src/lib/cache/cache-keys.test.ts                    ← 8 tests
src/lib/queue/job-id.test.ts                        ← 8 tests
src/lib/error/retryable-error.test.ts               ← 19 tests
src/lib/security/rate-limit.test.ts                 ← 5 tests  (mocked Redis)
src/lib/worker/worker-concurrency.test.ts           ← 6 tests  (dynamic import + vi.resetModules)
src/lib/health/health.service.test.ts               ← 7 tests
src/services/ai/ai-observability.service.test.ts    ← 6 tests  (mocked repository + logger)
src/lib/security/prompt-security.test.ts            ← 6 tests
```

Total: **70 tests across 9 test files**

---

## Mocking Strategy

| Test File | What is Mocked | Why |
|---|---|---|
| `rate-limit.test.ts` | `@/lib/redis` → `connectRedis` returns a mock Redis object | Rate limiter calls real Redis; we test logic only |
| `ai-observability.service.test.ts` | `@/repositories/ai-request-log.repository` + `@/lib/logger` | Prevents real DB writes; tests service logic only |
| `worker-concurrency.test.ts` | No mocks — uses `vi.resetModules()` + dynamic import | Constants are evaluated at module load time; must reimport for each env config |

---

## Manual Testing Still Required

Even with this test suite, manually verify:
- Document generation flow (worker → Gemini → DB write)
- FastAPI embedding service (needs Python venv active)
- Health check endpoints (`/api/health`, `/api/health/ready`, `/api/health/deep`)
- Rate limiting on AI actions (generate 4+ documents rapidly)
- Security headers (check via browser devtools Network tab)
- Case detail cache invalidation (generate doc, check data freshness)

---

## Commands

```powershell
# Run all tests once
npm run test

# Run in watch mode (during development)
npm run test:watch

# Typecheck
npm run typecheck

# Audit
npm run audit:phase0
```

---

## Future Improvements

- Add tests for `checkEnv()` and `checkEmbeddingProviderConfig()` methods of `HealthService`
- Add tests for `createCacheHash` edge cases (empty object, null values, deeply nested)
- Add tests for `QueueProducerService` duplicate job prevention logic (mocking BullMQ queues)
- Add tests for `CacheInvalidationService` (mocking `CacheService`)
- Add snapshot tests for prompt templates as they evolve
- Consider `@vitest/coverage-v8` for coverage reporting if needed

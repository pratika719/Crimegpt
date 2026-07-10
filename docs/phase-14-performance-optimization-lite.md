# Phase 14 — Performance Optimization Lite

## Goal

Optimize obvious performance bottlenecks before production deployment without over-engineering. This is a targeted **lite optimization pass** focused on deployment readiness, not a full scaling exercise.

This phase intentionally avoids: deep performance engineering, APM integration, OpenTelemetry, load testing infrastructure, database sharding, new caching layers, major schema redesigns, or CDN tuning.

---

## What Was Optimized

### 1. Prisma Schema — Composite Indexes Added

**Model: `Case`**

Added two composite indexes that directly accelerate the case list/dashboard query pattern:

```prisma
@@index([userId, createdAt])   // accelerates: WHERE userId = ? ORDER BY createdAt DESC
@@index([userId, updatedAt])   // accelerates: WHERE userId = ? ORDER BY updatedAt DESC
```

**Why**: The `CaseRepository.findAll(userId)` query uses `WHERE userId = ... ORDER BY createdAt DESC`. Without a composite index, Postgres must scan all rows with that `userId` and sort them. With `(userId, createdAt)`, the index covers both the filter and the sort — the planner can use an index scan in order.

**What was already good**: All other hot models (`GeneratedDocument`, `AIRequestLog`, `CaseActivity`, `Evidence`, `ChecklistItem`, `Person`) had their relevant indexes. No unnecessary indexes were added.

---

### 2. Worker Concurrency — Centralized Module

**New file: `src/lib/worker/worker-concurrency.ts`**

Previously, worker concurrency was configured using different, inconsistent env variable names scattered across `worker-registry.ts` with raw `Number(process.env.X ?? fallback)` calls. The document generation worker was using a global `WORKER_CONCURRENCY=2` default, meaning Gemini jobs could run two at a time — wasteful and expensive on a free tier.

The new module:
- Defines a single `WORKER_CONCURRENCY` object as the source of truth.
- Applies safe integer validation — invalid env values silently fall back to the default.
- Enforces correct production defaults:

| Worker | Default Concurrency | Reason |
|---|---|---|
| `DOCUMENT_GENERATION` | **1** | Gemini is slow and costs quota — serial is safer |
| `EMBEDDING` | **2** | FastAPI is CPU-heavy but handles parallelism |
| `INGESTION` | **1** | Avoids write contention on document chunks |
| `EMAIL` | **2** | Lightweight I/O — mild parallelism is fine |
| `CLEANUP` | **1** | Low-urgency background janitor |

**`worker-registry.ts`** updated to import and use `WORKER_CONCURRENCY.*` constants throughout.

---

### 3. Cache Invalidation Gap Fixed

**File: `src/workers/document-generator.processor.ts`**

**The bug**: When a background worker completed document generation, it wrote the new document to the database but did **not** invalidate the Redis case detail cache. The next time a user opened the case detail page (within the 30s TTL window), they would see stale data — the old generated documents list, not the new one.

**The fix**: After a successful `documentGeneratorService.generateDocument()` call, the processor now calls:

```ts
await cacheInvalidationService.invalidateCaseMutation({ userId, caseId });
```

This evicts the case detail cache key, the case dashboard cache key, and the AI summary cache key, ensuring the next request hits the database and gets fresh data. The call is wrapped in a non-fatal try/catch so a Redis failure never causes the job to fail — the document is already saved.

---

### 4. Structured Logging Cleanup

**Files: `case.services.ts`, `person.service.ts`**

Both services had `console.log` calls using emoji-prefixed strings left over from early development:

```ts
// Before
console.log(`💼 [CaseService] Updating case ID: ${id} by user: ${userId}`);

// After
logger.info({ caseId: id, userId }, "Updating case");
```

Replacing these with structured `logger.info` calls ensures:
- Logs are machine-parseable JSON in production.
- Fields are queryable/filterable in log aggregators.
- No mixed-format log lines.
- Consistent with all other services that already use Pino.

---

### 5. `.env.example` Expanded

Previously `.env.example` had only 5 lines, missing most required variables. It now documents all env keys grouped by category:

- Database, Redis, Auth (NextAuth), AI/Gemini, Embedding service, Logging, Health checks, and Worker concurrency variables.

---

## Prisma Query Review

| Query | Assessment |
|---|---|
| `findAll(userId)` — dashboard | Fetches flat `Case` rows only. No relations. Cached 60s. ✅ |
| `findById(id, userId)` — detail | Fetches 14 relations. Intentional for detail page. Cached 30s. Acceptable. ✅ |
| `findLatestByType` — doc repo | Targeted `caseId + type` query with `orderBy createdAt`. Covered by index. ✅ |
| `findById` — document repo | Uses `case: { userId }` relation filter — ownership-safe. ✅ |

---

## N+1 Query Review

No N+1 patterns found in production service paths. All relational data is fetched via `include` in a single query, not via loops with per-item DB calls.

---

## Index Review

| Model | Indexes Added | Reason |
|---|---|---|
| `Case` | `(userId, createdAt)`, `(userId, updatedAt)` | Composite for list + ordering |
| All others | None needed | Already well-indexed |

---

## Cache Verification

| Cache Key | TTL | Status |
|---|---|---|
| `cache:case-dashboard:{userId}` | 60s | ✅ Active |
| `cache:case-detail:{userId}:{caseId}` | 30s | ✅ Active — now correctly invalidated after doc generation |
| `cache:query-embedding:{hash}` | 24h | ✅ Active in FastAPI embedding provider |
| `cache:law-retrieval:{hash}` | 6h | ✅ Active in LawRetriever |
| `cache:ai-summary:{caseId}` | N/A | ✅ Invalidated on case mutations |
| Mutation responses | — | Not cached ✅ |
| Auth/session | — | Not cached ✅ |
| Job status polling | — | Not cached ✅ |

---

## Duplicate Job Prevention

Fully implemented in Phase 9 (`queue-producer.service.ts`). No changes needed:
- Active/waiting/delayed/prioritized jobs are reused.
- Force regenerate creates a fresh job ID.
- Completed/failed jobs are cleaned before a new one is enqueued.

---

## FastAPI Call Optimization

- Single-text embedding calls are cached by `FastAPIEmbeddingProvider` (24h, keyed by hash of normalized text).
- Law retrieval results are cached by `LawRetriever` (6h, keyed by hash of normalized query + topK).
- No local Node.js embedding model (`@huggingface/transformers`) present in any production path.

---

## Gemini Call Optimization

Document generation concurrency is now `1` by default, preventing concurrent Gemini calls from the same worker process. Combined with existing duplicate job prevention, Gemini is called at most once per active document generation job.

---

## Worker Concurrency

All workers now configured via `src/lib/worker/worker-concurrency.ts`. Can be overridden per-queue in `.env`:

```env
DOCUMENT_GENERATION_CONCURRENCY="1"
EMBEDDING_CONCURRENCY="2"
INGESTION_CONCURRENCY="1"
EMAIL_CONCURRENCY="2"
CLEANUP_CONCURRENCY="1"
```

---

## Build/Bundle Review

- No `@huggingface/transformers` or local model imports in production paths.
- Worker files are isolated from client/browser runtime.
- No known large unused imports in hot paths.
- Build warning about BullMQ `child-processor.js` is a known upstream warning, not caused by this phase.

---

## What We Intentionally Did Not Optimize

- Deep `findById` query (14 relations) — it is intentional for the case detail page.
- Query planner analysis / `EXPLAIN ANALYZE` — out of scope for lite pass.
- Bundle size micro-optimization — no significant savings identified.
- CDN / edge caching — out of scope.
- Database connection pooling tuning — out of scope.
- Load testing infrastructure — out of scope.

---

## Manual Test Plan

1. **Dashboard load**: Verify dashboard loads normally with no extra relational payloads.
2. **Cache invalidation**: Generate a document → wait for completion → open case detail → verify new document appears (not stale).
3. **Duplicate job protection**: Click generate rapidly → only one active job should be created.
4. **Embedding cache**: Run same law query twice → second call should hit Redis cache.
5. **Worker startup**: Check worker logs for correct per-queue concurrency values.
6. **No console.log in prod paths**: Confirm logs are structured JSON only.

---

## Future Improvements

- Add `SELECT` projection to `findAll` if more fields are added to `Case` in future phases.
- Consider `@@index([userId, status, createdAt])` triple composite if filtering by status on the dashboard becomes common.
- Consider pagination for the case list query if user case counts grow large.
- Consider Redis pipeline for batch cache invalidation on bulk mutations.

# Document Generation Flow — Bug Analysis & Implementation Plan

## Executive Summary

After a comprehensive audit of the entire document generation pipeline (actions → queue → worker → document generator → Gemini → Redis → DB → observability), I've identified **18 unique bugs/issues**. These span five layers: **Worker & Queue**, **Document Generator Service**, **Redis/Locking**, **Observability**, and **Prompt/Schema**.

The core issue is that the system was built incrementally in phases — first synchronous AI generation, then async queue-backed generation — but the two paths were never fully reconciled, leaving misaligned progress reporting, orphaned transactions, and lost observability data.

Below is the full bug catalog organized by severity, followed by a phased implementation plan.

---

## BUG CATALOG

### CRITICAL (5 bugs — cause silent data loss or hard failures)

#### 🐛 BUG-01: Worker Progress Updates Are Out of Sync with Actual Work
**File:** `src/workers/document-generator.processor.ts`
**Severity:** CRITICAL

```
Progress timeline (current):  STARTED(5%) → BUILDING_CONTEXT(20%) → [FULL GEMINI + DB WORK] → SAVING(90%) → COMPLETED(100%)
Progress timeline (correct):  STARTED(5%) → BUILDING_CONTEXT(20%) → GENERATING(50%) → SAVING(90%) → COMPLETED(100%)
```

All the actual work (Gemini API call ~15–45s + DB transaction ~5–20s) happens inside `documentGeneratorService.generateDocument()`. The `updateProgress` calls for `SAVING` and `COMPLETED` run **after** the function returns, meaning:
- The UI stays at 20% for 30–60 seconds
- Then jumps instantly to 100%
- Progress polling offers no real feedback to the user

#### 🐛 BUG-02: AI Observability Data Lost for Background Document Generation
**Files:** `src/services/document-engine/document-generator.service.ts` (line ~103), `src/workers/document-generator.processor.ts`

In `generateDocument()`:
```typescript
// Store AIRequestLog for observability (only if not background job since worker logs it)
if (!requestId) {
    await aiObservabilityService.logRequest(userId, {
        prompt: basePrompt,
        response: rawResponse,
        tokenUsage,
        retrievedContext: ...,
        ...
    }, tx);
}
```

When called from the worker (`requestId` is truthy), AIRequestLog creation is **skipped inside the transaction**. The worker then calls `aiObservabilityService.logSuccess()` separately, but that only logs:
- `requestType`, `modelUsed`, `latencyMs` ✓
- `prompt`, `response`, `tokenUsage`, `retrievedChunks` ✗ MISSING

**Impact:** All rich prompt/response telemetry is lost for queue-backed document generation. You can't debug what prompt was sent or what the AI responded.

#### 🐛 BUG-03: `ai-request-log.repository.ts` — New Signature Ignores Transactions
**File:** `src/repositories/ai-request-log.repository.ts`

The single-argument overload `create(input: CreateAIRequestLogInput)` always uses `prisma` directly:

```typescript
async create(input: CreateAIRequestLogInput): Promise<any> {
    const client = prisma; // Always uses global prisma, never tx!
    return client.aIRequestLog.create({...});
}
```

The legacy overload (3-arg) supports `tx`, but the new overload (used by worker's `logSuccess`/`logFailure`) does not. This means:
- No atomicity between document creation and observability logging
- If document creation succeeds but observability log fails, you have an orphaned document with no audit trail
- If document creation fails, the observability log was never written anyway (but no rollback needed)

#### 🐛 BUG-04: Redis Lock Error Is Not Retryable
**File:** `src/lib/redis/redis-lock.ts` (line 41)

```typescript
if (!lock) {
    throw new Error("Resource is locked. Another operation is already running.");
}
```

When a Redis lock can't be acquired, it throws a generic `Error`. The `isRetryableError()` function checks the error message against patterns like "timeout", "rate limit", "503", etc. — "Resource is locked" does NOT match any pattern.

**Impact:** If two document generation requests come in concurrently, the second one gets a **permanent failure** instead of a **transient retry** through BullMQ's retry mechanism. The user sees an error instead of the system retrying.

#### 🐛 BUG-05: `generateDocument` Throws Generic `Error` Instead of Classified Errors
**File:** `src/services/document-engine/document-generator.service.ts`

All error throws are plain `Error`:
- `"Case not found for ID: ${caseId}"` — should be `NonRetryableError`
- `"Validation Failed: Cannot generate a Charge Sheet without..."` — should be `NonRetryableError`
- `"Failed to parse or validate ${type} AI output: ..."` — should be `NonRetryableError`

BullMQ's `isRetryableError()` attempts to classify by message matching, but this is fragile and misses edge cases.

---

### HIGH (5 bugs — cause UX degradation or incorrect behavior)

#### 🐛 BUG-06: Duplicate `enrichContext` Call
**File:** `src/services/document-engine/document-generator.service.ts`

```typescript
let context = await unifiedContextService.buildUnifiedCaseContext(caseId, userId);
context = this.enrichContext(context);   // ← First call (line ~33)

if (type === DocumentType.CHARGE_SHEET) { ... }
if (type === DocumentType.FIR) { ... }

context = this.enrichContext(context)    // ← Second call (line ~65), NO semicolon!
```

`enrichContext` is called **twice** — a clear copy-paste error. The second call:
1. Is completely redundant — the first call already enriched all fields
2. Has no trailing semicolon (ASI handles it, but fragile)

#### 🐛 BUG-07: Long-Running Gemini Calls May Trigger BullMQ Stalled Job Detection
**Files:** `src/ai/providers/gemini-provider.ts`, `src/workers/document-generator.processor.ts`

BullMQ workers have a `stalledInterval` (default: 30s) and `lockDuration` (default: 30s). If a worker doesn't call `job.extendLock()` and the job runs >30s, BullMQ marks it as stalled and re-queues it.

The Gemini provider has 3 retries with exponential backoff:
- Attempt 1: immediate, timeout 45s
- Attempt 2: after ~2s delay, timeout 45s
- Attempt 3: after ~4s delay, timeout 45s
- Total worst case: ~45s + ~47s + ~49s ≈ 140s

The first attempt can easily exceed 30s, causing BullMQ to think the worker died and re-queue the job. This can lead to **duplicate Gemini calls** (same prompt processed by two workers).

#### 🐛 BUG-08: `documentGeneratorService.generateDocument` Returns Before Progress Updates Complete
**File:** `src/workers/document-generator.processor.ts`

```typescript
// All the work happens here
await documentGeneratorService.generateDocument(caseId, userId, documentType, requestId);

// These run AFTER the function returns
await job.updateProgress({ status: "SAVING", progress: 90, ... });
await setAITempState({ status: "SAVING", progress: 90, ... });
await job.updateProgress({ status: "COMPLETED", progress: 100, ... });
await setAITempState({ status: "COMPLETED", progress: 100, ... });
```

If `generateDocument()` throws, the progress updates at 90% and 100% never execute. The error handling (`catch` block) also throws, so neither `SAVING` nor `COMPLETED` progress is ever reported.

#### 🐛 BUG-09: Queue Producer Job Dedup Logic Does Not Handle Removed Jobs
**File:** `src/services/queue/queue-producer.service.ts`

```typescript
const existingJob = await documentGenerationQueue.getJob(baseJobId);
if (existingJob) { ... handle states ... }

// Job doesn't exist → create with same jobId
// (BullMQ won't error, but if removeOnComplete cleaned it up, we're creating a fresh job)
```

When `removeOnComplete` cleans up a completed job (after 1 hour), `getJob()` returns null. A new job is created with the same ID. This is **correct behavior**, but the comment in the code suggests confusion.

The real issue: when `forceRegenerate` is `false` and the SAME jobId is used, BullMQ's built-in dedup prevents adding a new job. The code handles this correctly but the flow is unintuitive.

#### 🐛 BUG-10: `checkRateLimit` Uses Redis `INCR` Without Atomicity
**File:** `src/lib/security/rate-limit.ts`

```typescript
const count = await redis.incr(input.key);
if (count === 1) {
    await redis.expire(input.key, input.windowSeconds);
}
```

There's a race condition between `INCR` and `EXPIRE` — if two requests arrive simultaneously, both get `count === 1`, and both call `EXPIRE`. This is a minor race that doesn't cause incorrect rate limiting (the TTL is just set twice), but it's worth noting.

---

### MEDIUM (5 bugs — code quality, maintainability, minor correctness)

#### 🐛 BUG-11: `bullmq-connection.ts` — Duplicate Environment Variable Fallback
**File:** `src/lib/queue/bullmq-connection.ts`

```typescript
const redisUrl = process.env.REDIS_URL || process.env.REDIS_URL;
```

Fallback is to the **same variable**. Likely should be `REDIS_TLS_URL` or similar.

#### 🐛 BUG-12: Prompt Builders Duplicate Law Formatting Logic
**Files:** `src/ai/prompts/fir-generation.prompt.ts`, `src/ai/prompts/chargesheet-generation.prompt.ts`

Both files manually format law references with identical logic (maps over laws, builds section/offense/punishment/description blocks). `promptExecutionHelper.formatLawsContext()` already exists in `ai-shared.service.ts` but is only used by `investigation-summary.prompt.ts`.

#### 🐛 BUG-13: `ai-diagnostics.action.ts` Uses Dynamic Import of Singleton
**File:** `src/actions/ai-diagnostics.action.ts`

```typescript
const { aiDiagnosticsService } = await import("@/services/case/ai-diagnostics.service");
```

Dynamic import of a singleton service on every action call. The import should be at the top of the file. This works but adds unnecessary overhead.

#### 🐛 BUG-14: `email.proccessor.ts` — Typo in Filename
**File:** `src/workers/email.proccessor.ts`

Filename has a typo: "proccessor" (extra 'c'). Should be "processor".

#### 🐛 BUG-15: `fir.schema.ts` — FIR Schema Requires `applicableSections.min(1)` But AI May Return Empty
**File:** `src/schema/fir.schema.ts`

```typescript
applicableSections: z.array(...).min(1, "At least one applicable section is required"),
```

If the RAG retrieval returns no relevant laws and the AI decides no sections apply, the Zod validation fails. The `chargesheet.schema.ts` has a similar issue. `investigation-summary.schema.ts` handles this correctly (allows empty array).

---

### LOW (3 bugs — polish, edge cases)

#### 🐛 BUG-16: CaseRepository.update() Doesn't Support Transaction
**File:** `src/repositories/case.repository.ts`

`updateStatus()` accepts a `tx` parameter, but `update()` always uses `prisma` directly. Inconsistent — can cause issues if `update()` is ever called inside a transaction.

#### 🐛 BUG-17: Worker Health Server Lacks Readiness Probe
**File:** `src/workers/index.ts`

The health server only has a `/health` endpoint. No `/ready` endpoint that checks Redis or DB connectivity. Container orchestrators can't distinguish "alive" from "ready to serve".

#### 🐛 BUG-18: Timeout Mismatch — AI Timeout (45s) vs BullMQ Lock Duration (30s default)
**Cross-cutting:** `src/lib/ai/with-ai-timeout.ts` (45s), BullMQ defaults (30s)

The Gemini provider's `withAITimeout` is 45s, but BullMQ's default `lockDuration` is 30s. If a Gemini call takes between 30-45s, BullMQ marks the job as stalled before the call completes.

---

## IMPLEMENTATION PLAN

### Phase 1: Fix Critical Bugs (Highest Impact)
| # | Bug | Complexity | Files To Modify |
|---|---|---|---|
| 1 | BUG-05: Classify errors as Retryable/NonRetryable | Low | `document-generator.service.ts`, `redis-lock.ts` |
| 2 | BUG-04: Make Redis lock failure retryable | Low | `redis-lock.ts` |
| 3 | BUG-01: Move progress updates into generateDocument | Medium | `document-generator.service.ts`, `document-generator.processor.ts` |
| 4 | BUG-02+BUG-03: Fix AI observability for background jobs | Medium | `document-generator.service.ts`, `document-generator.processor.ts`, `ai-request-log.repository.ts` |

### Phase 2: Fix High Bugs
| # | Bug | Complexity | Files To Modify |
|---|---|---|---|
| 5 | BUG-06: Remove duplicate enrichContext call | Trivial | `document-generator.service.ts` |
| 6 | BUG-07: Extend BullMQ lock for long Gemini calls | Medium | `document-generator.processor.ts` or worker config |
| 7 | BUG-08: Progress update ordering | Low | `document-generator.processor.ts` |
| 8 | BUG-10: Fix rate limiter race condition | Low | `rate-limit.ts` |

### Phase 3: Fix Medium/Low Bugs
| # | Bug | Complexity | Files To Modify |
|---|---|---|---|
| 9 | BUG-12: Deduplicate law formatting | Low | `fir-generation.prompt.ts`, `chargesheet-generation.prompt.ts` |
| 10 | BUG-13: Static import for ai-diagnostics action | Low | `ai-diagnostics.action.ts` |
| 11 | BUG-14: Fix email processor filename | Low | Rename file + update import |
| 12 | BUG-15: Relax FIR/Chargesheet schema for missing sections | Low | `fir.schema.ts`, `chargesheet.schema.ts` |
| 13 | BUG-11: Fix env var fallback | Trivial | `bullmq-connection.ts` |
| 14 | BUG-16: Add tx support to CaseRepository.update() | Low | `case.repository.ts` |
| 15 | BUG-17: Add readiness probe | Low | `workers/index.ts` |
| 16 | BUG-18: Align timeouts | Low | `with-ai-timeout.ts` or worker options |

### Key Design Decisions

1. **NO new files** — all changes modify existing files
2. **NO new dependencies** — only using what's already in the project
3. **Keep the dual path** (sync + queue) — both paths should work correctly
4. **Don't refactor the entire architecture** — targeted fixes only
5. **Preserve all existing contracts** — action responses, queue payloads, DB schemas

---

## Verdict

The document generation flow is functional but suffers from **integration debt** — the sync path (legacy direct calls) and async path (BullMQ workers) were built at different times and never fully harmonized. The fixes above are all contained in existing files and don't require architectural changes.

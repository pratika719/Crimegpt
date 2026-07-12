# Error Scenarios Review — Document Generation Flow

## All Scenarios Traced End-to-End

### Layer 1: Action Layer (before job is queued)

| # | Scenario | Entry Point | Detection | UX Outcome | Status |
|---|---|---|---|---|---|
| 1a | Invalid input (bad schema) | `generateDocumentAction` → `validateActionInput` | Zod safeParse returns failure | Toast error + loading stops | ✅ FIXED |
| 1b | Unauthorized (no session) | Same → `auth()` returns null | `actionFailure("UNAUTHORIZED")` | Toast error + loading stops | ✅ FIXED |
| 1c | Rate limited | Same → `checkRateLimit` returns denied | `actionFailure("RATE_LIMIT_EXCEEDED")` | Toast error + loading stops | ✅ FIXED |
| 1d | Redis down (queue producer fails) | Same → `addDocumentGenerationJob` throws | Caught by `validateActionInput` outer catch → `actionFailure("INTERNAL_ERROR")` | Toast error + loading stops | ✅ FIXED |
| 1e | BullMQ add() fails | Same → `documentGenerationQueue.add()` throws | Same as 1d | Toast error + loading stops | ✅ FIXED |

**All action-layer failures converge**: `handleGenerate` checks `response.success`, shows toast, sets `actionType=null` → loading stops. No persistent error banner here (the document never started generating).

### Layer 2: Queue Layer (job queued, worker picks up)

| # | Scenario | Detection | Worker | Polling | UX Outcome | Status |
|---|---|---|---|---|---|---|
| 2a | Worker crashes mid-generation | BullMQ `lockDuration: 120s` → stalled → re-queue | Retries × 3, then "failed" state | `useJobPolling` sees "failed" → stops | Error banner + toast + "Try Again" | ✅ FIXED |
| 2b | Gemini API unreachable/invalid key | `geminiProvider.generateJSON` throws `AIProviderError` | `setAITempState("FAILED")`, `logFailure`, re-throws | Poll sees "failed" | Error banner + toast | ✅ FIXED |
| 2c | Gemini returns bad JSON / Zod fails | `JSON.parse` or `config.schema.parse` throws | `setAITempState("FAILED")`, throws `NonRetryableError` | Poll sees "failed" | Error banner + toast | ⚠️ Retries ×2 wasted |
| 2d | Redis lock contention | `withRedisLock` throws `RetryableError` | BullMQ retries ×3, then "failed" | Poll sees "failed" | Error banner after ~15s | ✅ FIXED |
| 2e | DB transaction timeout | `prisma.$transaction` throws (40s timeout) | `setAITempState("FAILED")`, re-throws | Poll sees "failed" | Error banner | ✅ FIXED |
| 2f | Case not found / unauthorized | `caseRepository.findById` returns null | `NonRetryableError`, re-throws | Poll sees "failed" | Error banner + toast | ⚠️ Retries ×2 wasted |

### Layer 3: Worker Unavailable (job queued, no worker)

| # | Scenario | Detection | Polling | UX Outcome | Status |
|---|---|---|---|---|---|
| 3a | Worker process is down | Job stays "waiting" | `waitingStallMs: 15s` → `setError("stuck in queue...")` | Error banner after ~15s (3 poll cycles) | ✅ FIXED (was 3min) |
| 3b | Worker starts up late (~10s delay) | Job goes "waiting" → "active" at t=10s | `waitingSinceRef` reset when state changes | Normal progress, no error | ✅ FIXED (counter resets) |

### Layer 4: Polling Infrastructure Failures

| # | Scenario | Detection | UX Outcome | Status |
|---|---|---|---|---|
| 4a | `getJobStatusAction` returns "unknown" | Hook stops polling, sets status | Component → `handleGenerationError(failedReason)` | ✅ FIXED |
| 4b | `getJobStatusAction` throws (network) | Hook catch block → `setError(...)` | Component's error effect → `handleGenerationError(...)` | ✅ FIXED |
| 4c | Polling times out (90s hard limit) | `maxPollingMs: 90s` → `setError("timed out")` | Error effect → `handleGenerationError("Generation timed out...")` | ✅ FIXED |

### Layer 5: Edge Cases

| # | Scenario | Detection | UX Outcome | Status |
|---|---|---|---|---|
| 5a | User navigates away mid-generation | `useEffect` cleanup runs | `stoppedRef = true`, polling stops, no memory leak | ✅ FIXED |
| 5b | Rapid double-click "Generate" | Job dedup returns same `jobId` | Same polling, no duplicate job | ✅ FIXED |
| 5c | Cache invalidation fails after success | Caught in worker, logged as warning | Non-fatal, generation still succeeds | ✅ FIXED |
| 5d | onProgress callback fails (Redis down) during COMPLETED | Callback throws after DB transaction saved | Worker re-throws → job marked "failed" even though document exists. User sees error. On retry, dedup overwrites via `_requestId` | ⚠️ Confusing UX, no data loss |

---

## Remaining Gaps Found

### Gap 1: BullMQ retries `NonRetryableError` × 2 extra times
**Files**: `src/workers/document-generator.processor.ts`, `src/lib/queue/retry-policy.ts`

When `generateDocument` throws `NonRetryableError` (e.g., "Case not found", "Validation Failed: Cannot generate a Charge Sheet without..."), BullMQ still retries because its `attempts: 3` config is unconditional. The worker catches and re-throws, BullMQ retries × 2, then finally marks "failed".

**Impact**: User sees the error only after a 5-15s delay (backoff time) instead of immediately. No data corruption, but wasteful.

**Fix**: In the worker's catch block, call `discard()` or use `moveToFailed` with no retry for `NonRetryableError` instances. Or: catch before throwing and use a BullMQ-compatible approach (e.g., remove the job).

### Gap 2: `onProgress` callback failure after DB transaction committed
**File**: `src/services/document-engine/document-generator.service.ts`

After `prisma.$transaction` succeeds, the code calls `onProgress?.("COMPLETED", 100, ...)`. If this callback throws (Redis error in `setAITempState`), the error propagates and the worker marks the job as failed — even though the document was already saved to DB.

**Impact**: User sees "Generation failed" error, but the document exists in the database (versioned with `_requestId`). On "Try Again", the dedup logic finds the existing document via `_requestId` and overwrites it. No data loss, but the user sees a confusing error for a successful generation.

**Fix**: Wrap the COMPLETED progress report in a try/catch in `generateDocument`, or make the `onProgress` callback never throw.

### Gap 3: Legal Analysis (sync path) has no error banner
**File**: `src/components/case/case-analysis-panel.tsx`

The `LEGAL_ANALYSIS` document type runs via `analyzeCaseAction` — a direct (non-queue) call. If it fails, the `handleGenerate` function shows a toast error but **no persistent error banner** (no `generationError` state is set for this path). The user sees a toast that auto-dismisses.

**Impact**: Legal analysis errors are less visible than document generation errors.

**Fix**: After `!response.success` in the `LEGAL_ANALYSIS` branch, also set `setGenerationError(...)`.

### Gap 4: `isRetryableError()` function is dead code
**File**: `src/lib/error/retryable-error.ts`

The `isRetryableError()` function is exported but never imported or called anywhere in the codebase. BullMQ uses its own retry mechanism via job options, not our function. The function exists but has no consumers.

**Impact**: Code dead weight. The `retryable` property on error classes is never read by any part of the system.

**Fix**: Remove the function, or integrate it into the worker's catch block.

### Gap 5: Worker's FAILED temp state is set on EVERY attempt, not just the final one
**File**: `src/workers/document-generator.processor.ts`

The catch block sets `setAITempState("FAILED")` unconditionally (before the `if (isFinal)` check). On retry attempt 2, the `onProgress` callback overwrites FAILED with RUNNING again. This ping-pong is harmless but means the temp state briefly shows FAILED during retries.

**Impact**: If the polling happens to check exactly when temp state is FAILED but before the retry starts, the user might briefly see an error. But this is unlikely given the polling interval of 5s.

**Fix**: Only set FAILED temp state on the final attempt (inside `if (isFinal)`).

---

## Summary

| Status | Count | Scenarios |
|--------|-------|-----------|
| ✅ FIXED | 17 | 1a-1e, 2a-2f, 3a-3b, 4a-4c, 5a-5c |
| ⚠️ Remaining gap | 5 | 2c-2f wasted retries, 5d confusing UX, legal analysis no banner, dead code, temp state ping-pong |

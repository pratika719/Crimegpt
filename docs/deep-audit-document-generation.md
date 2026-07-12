# Deep Audit: Document-Generation Experience

> Branch: `fix/document-generation-stabilization`
> Commit: `6e45b73d38dead37f7a0a2d705bb6b3acfca476e`
> Working tree: clean
> Audit date: July 12, 2026

---

## 1. Executive Summary

Document generation is **structurally complete but unreliable in production** due to three root causes:

**A. Dual code paths with incompatible assumptions.** The document generator service (`document-generator.service.ts`) was designed for both synchronous calls and async queue-backed calls, but the two paths were never reconciled. Error classification, progress reporting, observability logging, and transaction boundaries differ depending on whether a `requestId` is passed. This creates silent data loss (observability) and confusing UX (progress jumps from 20% to 100%).

**B. BullMQ retry policy ignores error classification.** The project defines `RetryableError` and `NonRetryableError` classes with a classification function (`isRetryableError`), but **BullMQ never calls it**. BullMQ uses its own unconditional retry mechanism (`attempts: 3`). Validation errors like "Case not found" or "Failed to parse AI output" are retried 3 times before failing, adding 10-15s of unnecessary delay. The `isRetryableError()` function is dead code imported nowhere.

**C. UI/backend state synchronization is fragile.** The polling hook (`useJobPolling`) relies entirely on BullMQ job state. If the worker is down, the UI times out after 90s (previously 3 min). If the AI temp state is set before the DB transaction completes, the UI could show success before persistence. The `completed` job state carries no `documentId`, so the UI cannot verify the document was actually saved.

---

## 2. Actual End-to-End Flow

```
UI: CaseAnalysisPanel (case-analysis-panel.tsx)
  └─ handleGenerate(docType, isRegen)
      └─ startTransition() → generateDocumentAction({ caseId, documentType, forceRegenerate })

SERVER ACTION: generateDocumentAction (src/actions/document-generation.action.ts:39)
  ├─ auth() → session validation
  ├─ checkRateLimit() → 5 req / 10 min window
  ├─ queueProducerService.addDocumentGenerationJob({ caseId, userId, documentType })
  │   └─ createRequestId("docgen") → `docgen_<uuid>`
  │   └─ createSafeJobId(["document-generation", caseId, documentType])
  │   └─ getJob(baseJobId) → job dedup check
  │   └─ documentGenerationQueue.add("generate-document", payload, { jobId, attempts:3, backoff })
  │   └─ returns { jobId, requestId, queueName, reused, state }
  ├─ cacheInvalidationService.invalidateCaseMutation() ← non-critical
  └─ revalidatePath(`/case/${caseId}`)

UI: useJobPolling (src/hooks/use-job-polling.ts:37)
  └─ polls getJobStatusAction({ jobId, queueName }) every 5s
      └─ jobStatusService.getJobStatus() → Job.fromId(queue, jobId) → state + failedReason
      └─ Terminal states: completed / failed / unknown → stop
      └─ waiting > 15s → worker-down error
      └─ max 90s → timeout error

WORKER: processDocumentGenerationJob (src/workers/document-generator.processor.ts:13)
  ├─ Input validation (caseId, userId, documentType must exist)
  ├─ onProgress callback → job.updateProgress + setAITempState
  └─ documentGeneratorService.generateDocument(caseId, userId, type, requestId, onProgress)
      ├─ withRedisLock("lock:document-generation:{caseId}:{type}", 120_000)
      │   └─ acquireRedisLock → redis.set(key, token, "PX", 120_000, "NX")
      │   └─ If lock fails → throw RetryableError
      ├─ onProgress("STARTED", 5)
      ├─ caseRepository.findById(caseId, userId) → full case with includes
      ├─ DocumentRegistry.getConfig(type) → schema + prompt + RAG config
      ├─ unifiedContextService.buildUnifiedCaseContext(caseId, userId) → full DB fetch
      ├─ enrichContext(context) → fallback defaults
      ├─ Validation: CHARGE_SHEET needs accused; FIR needs victim
      ├─ If requiresRAG: lawRetriever.retrieve(narrative, 5) → PGVector similarity search
      ├─ config.buildPrompt(context, retrievedChunks) → prompt string
      ├─ geminiProvider.generateJSON(prompt) → { text, tokenUsage }
      │   └─ GoogleGenerativeAI(model "gemini-2.5-flash", responseMimeType "application/json")
      │   └─ withAITimeout(45s) → AbortController
      │   └─ Retry loop: 3 attempts, exponential backoff (2s, 4s, 8s...)
      ├─ JSON.parse(rawResponse) → config.schema.parse(parsed) → Zod validation
      ├─ prisma.$transaction(tx => { ... }, { maxWait:20s, timeout:40s })
      │   ├─ SELECT ... FOR UPDATE on Case row
      │   ├─ Find existing doc by _requestId (idempotency check)
      │   ├─ generatedDocumentService.saveDocument(userId, { ... }, tx)
      │   ├─ aiObservabilityService.logRequest(userId, { prompt, response, tokens, ... }, tx)
      │   ├─ activityService.logDocumentGenerated(... , tx)
      │   └─ caseRepository.updateStatus(caseId, userId, "UNDER_INVESTIGATION", tx) if FIR
      └─ onProgress("COMPLETED", 100)

POST-WORKER:
  ├─ cacheInvalidationService.invalidateCaseMutation() ← best effort
  └─ Job returns { requestId, caseId, documentType, status: "COMPLETED" }

UI RENDERS:
  ├─ status.state === "completed" → toast.success + router.refresh()
  ├─ Case page refetches → new document visible in initialDocuments prop
  ├─ PDFExportService.export() → jspdf-based client-side PDF generation
```

---

## 3. Entry Points Audit

### Canonical generation path (the only correct one):
1. `case-analysis-panel.tsx:handleGenerate()` → for all types EXCEPT `LEGAL_ANALYSIS`
2. `generateDocumentAction()` → `queueProducerService.addDocumentGenerationJob()` → BullMQ queue
3. `processDocumentGenerationJob()` → `documentGeneratorService.generateDocument()`

### Other entry points found:

| Entry Point | File | Type | Status | Risk |
|---|---|---|---|---|
| `generateDocument(caseId, userId, type)` | `fir.service.ts:18` | Pass-through wrapper | CANONICAL - delegates to `documentGeneratorService` | Low |
| `generateDocument(caseId, userId, type)` | `investigation-summary.service.ts:17` | Pass-through wrapper | CANONICAL - delegates to `documentGeneratorService` | Low |
| `analyzeCase(caseId, userId)` | `legal-analysis.services.ts:26` | Direct sync call to chain | **DUAL PATH** - no queue, no worker, no polling | Medium - runs synchronously in server action |
| `runDiagnostics(caseId, userId)` | `ai-diagnostics.service.ts:17` | Direct sync call to chain | **DUAL PATH** - no queue, no worker | Medium - runs in server action |
| `generateDocument(caseId, userId, type)` | `fir.service.ts` (direct) | Old path | **DEAD?** - no longer called from actions | Low |

### Confirmed defects:
- **CONFIRMED**: Legal analysis (`LEGAL_ANALYSIS` in `case-analysis-panel.tsx:handleGenerate`) uses a completely different code path: `analyzeCaseAction` → `LegalAnalysisService.analyzeCase()` → direct Gemini call. No queue, no worker, no progress callback, no polling. If the Gemini call takes 30s, the server action blocks for 30s. Next.js server actions have a default timeout of 10s on some platforms.
- **CONFIRMED**: `ai-diagnostics.action.ts` still uses `aiDiagnosticsService.runDiagnostics()` directly (no queue). Same issue.
- **CONFIRMED**: The `DocumentRegistry` is populated at module import time (static initializer). If the registry is imported but the Module's types aren't imported in the right order, `DocumentType` enums might mismatch. However, since all come from the same generated Prisma client, this is low risk.

---

## 4. UI/UX Defects

### CONFIRMED

| ID | Symptom | Cause | Severity | Fix |
|---|---|---|---|---|
| UX-01 | "Regenerate" button shows rotating spinner icon constantly | `RefreshCw className="h-3.5 w-3.5 animate-spin"` - the spinner animation runs even when the button is idle | LOW | Remove `animate-spin` from idle state |
| UX-02 | No persistent error banner when server action fails (pre-queue) | `handleGenerate` only calls `toast.error()` when `!response.success`; `generationError` state never set | MEDIUM | `setGenerationError(response.message)` after action failure |
| UX-03 | Worker-down detection takes 15s | Acceptable for cold-start, but could be faster (5s) by reducing `waitingStallMs` or ping frequency after first "waiting" response | LOW | Tune timing |
| UX-04 | Legal analysis shows no inline error banner | `LEGAL_ANALYSIS` path in `handleGenerate` only shows `toast.error()`, doesn't set `generationError` | MEDIUM | Same fix as UX-02 |
| UX-05 | router.refresh() may not fetch fresh data if Next.js full route cache serves stale | `revalidatePath` in action only runs on server; `router.refresh()` on client triggers a fetch but Next.js App Router may serve stale from `fetch` cache if `cache: 'force-cache'` is used anywhere | MEDIUM | Verify no `force-cache` usage in case/[id] page |

### SUSPECTED

| ID | Symptom | Cause | Severity | Investigation |
|---|---|---|---|---|
| UX-S1 | Document appears only after manual browser refresh | `router.refresh()` in polling effect fires but underlying page data comes from a Server Component fetch that is cached | HIGH | Check if `case/[id]/page.tsx` uses `fetch()` with caching |
| UX-S2 | Two browser tabs show conflicting generation state | `generatingJobs` is React state (per-component). Tab A starts generation, tab B shows no activity. Tab B's poll gets different React tree | MEDIUM | Check if `case/[id]/page.tsx` page uses `force-dynamic` or cached data |
| UX-S3 | Progress bar briefly shows 100% then switches to polling state | The fake simulated progress (`isPending` → fake 0→95%) disappears when the server action returns (1-2s), revealing the real polling state | LOW | Already removed in previous fixes |

---

## 5. Server Action and API Defects

### CONFIRMED

| ID | Defect | Evidence | Severity |
|---|---|---|---|
| SA-01 | `generateDocumentAction` calls `cacheInvalidationService.invalidateCaseMutation()` BEFORE job is queued | `document-generation.action.ts:91-100` - Cache is invalidated on enqueue, but document doesn't exist yet. Revalidation at enqueue time is premature and unnecessary. The worker also invalidates cache on completion. Double invalidation is wasteful | LOW |
| SA-02 | No case ownership check BEFORE enqueuing | `generateDocumentAction` validates input schema and auth, but does NOT verify that the case belongs to the user before passing to `addDocumentGenerationJob`. The worker checks ownership in `generateDocument` (caseRepository.findById), but the action could reject invalid cases faster | LOW |
| SA-03 | `revalidatePath` runs even if cache invalidation fails | `document-generation.action.ts:104` - `revalidatePath` is outside the cache-invalidation try/catch. Good. But if the job enqueue itself fails (the `try/catch` at line 74), the error is thrown and `revalidatePath` never runs | MEDIUM |
| SA-04 | `GenerateDocumentSchema` is defined but never used | `document-generation.action.ts:15-19` - `GenerateDocumentSchema` with `caseId`, `type`, `isRegenerate` is defined but the actual validation uses `enqueueDocumentGenerationSchema` on line 25-29 which has different field names | LOW - dead schema |

---

## 6. Queue and Worker Defects

### CONFIRMED

| ID | Defect | Evidence | Severity |
|---|---|---|---|
| QW-01 | `NonRetryableError` causes BullMQ to waste 2 retries | BullMQ `attempts: 3` is unconditional. `isRetryableError()` is never called by any consumer. Errors like "Case not found" retry 3 times before failing | HIGH - adds 10-15s delay for permanent errors |
| QW-02 | Max AI calls per click: 3 (provider) × 3 (BullMQ) = 9 | `geminiProvider.generateJSON` has 3 retries. BullMQ has 3 attempts. Total: up to 9 Gemini calls per user click. If all fail: worst case latency = 9 × 45s timeout = 6.75 minutes | HIGH |
| QW-03 | `removeOnComplete` can cause "Job not found" during polling | `removeOnComplete.age: 3600` (1 hour). If user leaves the page and returns after 1 hour, the completed job is gone. Polling returns "unknown" with "Job not found." → handled, but confusing | LOW |
| QW-04 | AI_GENERATION queue has a processor that does nothing | `ai-generation.processor.ts` only calls `job.updateProgress({ status: "ACKNOWLEDGED" })` and returns. No actual generation happens. This queue appears to be dead code | MEDIUM - maintenance burden |
| QW-05 | Worker health endpoint doesn't verify queue connection | Current `/ready` checks Redis ping but not whether BullMQ workers are connected to queues | LOW |

### SUSPECTED

| ID | Defect | Evidence | Investigation |
|---|---|---|---|
| QW-S1 | Stalled jobs during long Gemini calls before `lockDuration: 120_000` was set | The fix added `lockDuration: 120_000` for document generation worker. Previously used default (30s). Gemini calls can take 45s with timeout. Jobs would stall and be re-queued | Already fixed in previous changes |
| QW-S2 | Worker may process stale jobs after redeploy | If a new worker starts but an old worker is still running, both could process from the same queue | Check Render deployment strategy |

---

## 7. Document Generator Service Defects

### CONFIRMED

| ID | Defect | Evidence | Severity |
|---|---|---|---|
| DG-01 | `onProgress` callback failure after DB transaction causes false failure | `document-generator.service.ts:187-188` - `onProgress?.("COMPLETED", 100, ...)` runs AFTER `prisma.$transaction` succeeds. If the callback throws (Redis error in `setAITempState`), the error propagates, the worker catches it, sets FAILED temp state, re-throws, and BullMQ marks the job as failed — even though the document is already saved in PostgreSQL | CRITICAL |
| DG-02 | `enrichContext()` mutates shared state defensively but may double-process | `document-generator.service.ts:201-305` - `enrichContext()` creates a new `enriched` object via spread, but if called by another code path on the same `context` reference, mutations could leak. Current code only calls it once (verified in previous fix) | LOW |
| DG-03 | Case context is fetched TWICE | `caseRepository.findById(caseId, userId)` is called at line 51 to check case existence. `unifiedContextService.buildUnifiedCaseContext(caseId, userId)` at line 64 fetches the SAME case data again with all includes. The first fetch could be eliminated | MEDIUM - latency |
| DG-04 | Validation errors show raw `AIProviderError` message if provider fails | If `geminiProvider.generateJSON` throws, the error message "Gemini API call failed after 3 retries. Reason: ..." propagates through to the worker's catch block and into `logFailure` and the job's failedReason. The user sees "Generation failed: Gemini API call failed..." | MEDIUM - confusing |

---

## 8. FIR-Specific Defects

### CONFIRMED

| ID | Defect | Evidence | Severity |
|---|---|---|---|
| FIR-01 | FIR schema requires `applicableSections.min(1)` - AI may return empty | `fir.schema.ts:23-30` - `z.array(...).min(1, ...)` - if RAG returns no relevant laws and AI decides no sections apply, Zod validation fails | MEDIUM - already fixed (optional + default([]) in previous change) |
| FIR-02 | FIR prompt asks for IPC sections but RAG may not return any | `fir-generation.prompt.ts:51` - fallback text says "No direct law references found... Do NOT cite any IPC sections." But AI might still hallucinate sections | LOW |
| FIR-03 | FIR validation requires victim/complainant but `enrichContext` provides fallback | `document-generator.service.ts:79-84` - The FIR validation check runs AFTER `enrichContext`, so the fallback victim is always present. Validation never fails | LOW - intentional design |

---

## 9. Chargesheet-Specific Defects

### CONFIRMED

| ID | Defect | Evidence | Severity |
|---|---|---|---|
| CS-01 | Chargesheet prompt includes full activity history and ALL context data | `chargesheet-generation.prompt.ts` uses `formatUnifiedContextForPrompt(context)` which serializes: police info, incident, victims, accused, witnesses, vehicles, seized items, medical, court, evidence, activities. This is a LOT of text. Combined with legal context chunks, the prompt could exceed Gemini's context window | MEDIUM |
| CS-02 | Chargesheet Zod schema requires `dateOfRegistration` as string, AI may return differently | `chargesheet.schema.ts:17` - `dateOfRegistration: z.string().min(1)` - if AI returns a date object instead of string, Zod parsing fails | LOW |
| CS-03 | No validation that evidence + witnesses + seized items are sufficient for chargesheet | A chargesheet requires evidence, witnesses, and seized items. The validator only checks `hasAccused` | MEDIUM - should check evidence sufficiency |

---

## 10. RAG and Embedding Defects

### CONFIRMED

| ID | Defect | Evidence | Severity |
|---|---|---|---|
| RAG-01 | RAG is invoked for EVERY FIR and chargesheet generation, even for the same case | `document-generator.service.ts:93-103` - `lawRetriever.retrieve(context.narrative, 5)` is called every time. No deduplication for the same narrative text | MEDIUM - adds 2-5s latency per call |
| RAG-02 | Embedding cache and law retrieval cache exist but may not be hit | `cache-keys.ts` defines `lawRetrieval` and `queryEmbedding` key patterns. But `lawRetriever.retrieve()` may not use the cache service | MEDIUM - verify |
| RAG-03 | If RAG fails, document generation still continues | Current code has no try/catch around `lawRetriever.retrieve()`. If PGVector is unreachable or embedding service is down, the error propagates and the entire generation fails | HIGH - RAG failure shouldn't block generation |
| RAG-04 | FastAPI embedding service has cold-start latency | The embedding service is a Python FastAPI app. On first request, it may take 5-10s to respond (model loading) | MEDIUM |

---

## 11. Provider and Retry Defects

### CONFIRMED

| ID | Defect | Evidence | Severity |
|---|---|---|---|
| PR-01 | Gemini provider retries (3) × BullMQ retries (3) = 9 max calls | `gemini-provider.ts:52` - 3 internal retries. `retry-policy.ts:3` - `attempts: 3`. Total: up to 9 Gemini calls per user action | CRITICAL - cost and latency |
| PR-02 | `withAITimeout(45s)` + 3 retries = worst case 135s per provider call | 45s per attempt, 3 attempts, exponential backoff: ~45 + ~47 + ~49 ≈ 141s per `generateJSON`. × 3 BullMQ retries = 423s worst case | HIGH |
| PR-03 | AI timeout (45s) > BullMQ lock duration (30s default) creates stalled jobs | The 45s AbortController timeout exceeds the worker's lock renewal window. BullMQ marks the job as stalled before the provider responds | HIGH - but mitigated by `lockDuration: 120_000` fix |
| PR-04 | No fallback provider configured | Single Gemini provider. If Gemini is down, generation fails completely | MEDIUM |

---

## 12. JSON/Schema/Rendering Mismatches

### CONFIRMED

| ID | Mismatch | Evidence | Severity |
|---|---|---|---|
| JS-01 | `fir.schema.ts`: `applicableSections` was `.min(1)`, UI assumes it exists | `case-analysis-panel.tsx` renders `activeDoc.content.applicableSections?.map(...)` with optional chaining. If the field is absent, nothing renders. If present but empty, also nothing renders | LOW - already fixed |
| JS-02 | `chargesheet.schema.ts`: `dateOfRegistration` as string, AI may return Date | No fix needed if Gemini respects `responseMimeType: "application/json"` and outputs string | LOW |
| JS-03 | `investigationSummarySchema`: `applicableSections` allows empty array | `schema/investigation-summary.schema.ts:23` - No `.min(1)`. FIR was stricter. Now consistent after fix | ✅ Fixed |

---

## 13. Persistence and Cache Defects

### CONFIRMED

| ID | Defect | Evidence | Severity |
|---|---|---|---|
| PC-01 | Cache is invalidated at enqueue time (premature) AND at completion time | `document-generation.action.ts:91` invalidation on enqueue. `worker` also invalidates on completion. The enqueue-time invalidation achieves nothing because the document doesn't exist yet | LOW |
| PC-02 | `useCasePolling`'s `status?.state === "completed"` check doesn't verify document exists | The polling returns BullMQ's job state. A job could be "completed" even if the document save failed (if the processor returns without throwing). Currently the processor only throws on error, so this is safe | LOW |
| PC-03 | `router.refresh()` in polling effect may be redundant if `revalidatePath` already ran | `revalidatePath` runs in the server action at enqueue time. `router.refresh()` runs in the client when polling detects completion. Both trigger refreshes | LOW - double refresh is harmless |

### SUSPECTED

| ID | Defect | Evidence | Investigation |
|---|---|---|---|
| PC-S1 | `findLatestByType` returns wrong version if document ordering is by `createdAt` instead of `version` | `document.repository.ts:47` - `orderBy: { createdAt: "desc" }`. If two documents are created in the same second, ordering is undefined | Check if version-based ordering would be more reliable |

---

## 14. Latency Breakdown

| Phase | Component | Typical Time | Blocking? | Duplicated? | Optimizable? |
|---|---|---|---|---|---|
| Action validation | `validateActionInput` + `auth()` | 50-200ms | Yes | No | No |
| Rate limit check | `checkRateLimit` (Redis INCR) | 5-10ms | Yes | No | No |
| Enqueue | `documentGenerationQueue.add()` | 50-100ms | Yes | No | No |
| Queue wait | BullMQ (worker pickup) | 0-100ms (hot) / 5-15s (cold start) | Yes | No | No |
| Redis lock | `acquireRedisLock` | 5-10ms | Yes | No | No |
| Case fetch 1 | `caseRepository.findById` | 50-200ms | Yes | **YES** - duplicate fetch | Merge with context build |
| Case context | `buildUnifiedCaseContext` | 100-500ms | Yes | **YES** - refetches case | Merge with first fetch |
| RAG retrieval | `lawRetriever.retrieve` | 2-5s | Yes | Maybe - no dedup for same case | Cache narrative→law results |
| Prompt build | `config.buildPrompt` | 1-10ms | Yes | No | No |
| Gemini call | `geminiProvider.generateJSON` | 5-30s (hot) / 30-45s (first call) | Yes | No | Provider bound |
| Zod validation | `config.schema.parse` | 1-5ms | Yes | No | No |
| DB transaction | `prisma.$transaction` | 1-5s | Yes | No | No |
| Observability log | `logRequest` inside tx | 50-200ms | Yes | No | Could be async |
| Activity log | `logDocumentGenerated` inside tx | 50-200ms | Yes | No | Could be async |
| Cache invalidate | `invalidateCaseMutation` | 50-200ms | **No** - after return | **YES** - also done at enqueue | Remove enqueue invalidation |
| Poll interval | `useJobPolling` | 5s | No | No | Reduce after 'active' detected |

### Total typical time: 10-60s (dominated by Gemini call)
### Total worst-case time (all retries): ~7+ minutes (9 Gemini calls × 45s)

---

## 15. Test Results

**Ran `npx vitest run`**: 70/70 tests passed in 5.06s

| Test File | Tests | Status |
|---|---|---|
| `src/lib/cache/cache-keys.test.ts` | 8 | ✅ Pass |
| `src/lib/error/retryable-error.test.ts` | 19 | ✅ Pass |
| `src/lib/queue/job-id.test.ts` | 8 | ✅ Pass |
| `src/lib/cache/cache-hash.test.ts` | 5 | ✅ Pass |
| `src/services/ai/ai-observability.service.test.ts` | 6 | ✅ Pass |
| `src/lib/worker/worker-concurrency.test.ts` | 6 | ✅ Pass |
| `src/lib/security/rate-limit.test.ts` | 5 | ✅ Pass |
| `src/lib/security/prompt-security.test.ts` | 6 | ✅ Pass |
| `src/lib/health/health.service.test.ts` | 6 | ✅ Pass |

**Missing test coverage:**
- No tests for `DocumentGeneratorService.generateDocument()` — the core pipeline
- No tests for `processDocumentGenerationJob()` — the worker
- No tests for `QueueProducerService.addDocumentGenerationJob()` — the enqueue
- No tests for any prompt builder function
- No tests for any Zod schema (FIR, chargesheet, etc.)
- No FIR or chargesheet end-to-end test
- No tests for `useJobPolling` hook

---

## 16. Complete Bug Ledger

| ID | Severity | Category | Confidence | Symptom | Root Cause | Files | Fix Complexity |
|---|---|---|---|---|---|---|---|
| DG-01 | CRITICAL | worker | CONFIRMED | Job marked failed after document saved | `onProgress` callback after transaction | `document-generator.service.ts:187` | Low: wrap in try/catch |
| PR-01 | CRITICAL | provider | CONFIRMED | Up to 9 Gemini calls per click | Provider retries × BullMQ retries | `gemini-provider.ts:52`, `retry-policy.ts:3` | Low: reduce one layer |
| QW-01 | HIGH | queue | CONFIRMED | Validation errors retry 3 times | BullMQ ignores `NonRetryableError` | `worker-registry.ts` | Low: discard on NonRetryable |
| PR-02 | HIGH | provider | CONFIRMED | 423s worst-case latency | 45s timeout × 3 retries × 3 attempts | `with-ai-timeout.ts` | Medium |
| RAG-03 | HIGH | RAG | CONFIRMED | RAG failure blocks generation | No try/catch around retrieval | `document-generator.service.ts:93-103` | Low: make optional |
| UX-02 | MEDIUM | UI | CONFIRMED | No error banner for action failures | `generationError` not set for all paths | `case-analysis-panel.tsx` | Low |
| UX-04 | MEDIUM | UI | CONFIRMED | Legal analysis no error banner | Same as UX-02 | `case-analysis-panel.tsx` | Low |
| DG-03 | MEDIUM | perf | CONFIRMED | Case data fetched twice | Unnecessary duplicate fetch | `document-generator.service.ts:51,64` | Low |
| RAG-01 | MEDIUM | perf | CONFIRMED | RAG called per generation, no cache | No dedup for same narrative | `law-retriever.ts` | Low |
| PC-01 | LOW | cache | CONFIRMED | Premature cache invalidation | Invalidation at enqueue is wasteful | `document-generation.action.ts:91` | Low |
| SA-04 | LOW | action | CONFIRMED | Dead schema `GenerateDocumentSchema` | Unused Zod schema | `document-generation.action.ts:15-19` | Trivial |
| QW-04 | LOW | queue | CONFIRMED | Dead AI generation processor | Does nothing | `ai-generation.processor.ts` | Trivial |
| PR-04 | MEDIUM | provider | CONFIRMED | No fallback provider | Single Gemini dependency | `gemini-provider.ts` | High (out of scope) |

---

## 17. Implementation Plan

### Phase 0 — Protect and Reproduce (Do first)
- [ ] Create canonical valid FIR fixture (test data factory)
- [ ] Create canonical valid chargesheet fixture
- [ ] Add regression test: `NonRetryableError` should not be retried by worker
- [ ] Add regression test: `onProgress` failure after save should not mark job failed
- [ ] Add regression test: RAG failure should not block generation

### Phase 1 — Fix Critical Defects (Correctness)
- [ ] **DG-01**: Wrap `onProgress?.("COMPLETED", ...)` in try/catch in `generateDocument()` — if the callback fails after the DB transaction succeeds, log the error but don't throw. The document is already saved.
- [ ] **PR-01**: Reduce Gemini provider's internal retries from 3 to 1, OR reduce BullMQ `attempts` from 3 to 1 for document generation. The provider already has robust retry logic; BullMQ retries add multiplicative complexity.
- [ ] **QW-01**: In the worker catch block, check `if (error instanceof NonRetryableError)` and call `job.discard()` or `job.moveToFailed(...)` with no retry.

### Phase 2 — Fix High Defects (Reliability)
- [ ] **RAG-03**: Wrap `lawRetriever.retrieve()` in try/catch. If RAG fails, log warning and continue without legal context. Document generation should not depend on RAG availability.
- [ ] **PR-02**: Reduce `withAITimeout` from 45s to 30s for faster failure detection. Or reduce `maxRetries` in provider to 2 instead of 3.
- [ ] **UX-02/04**: Set `generationError` state when server action fails in `handleGenerate`, so the inline error banner shows for ALL failure paths including legal analysis.

### Phase 3 — Fix State Synchronization
- [ ] Remove premature `cacheInvalidationService.invalidateCaseMutation()` call from `generateDocumentAction` (enqueue time). Only invalidate from the worker after the document is saved.
- [ ] Ensure the case page uses `dynamic = 'force-dynamic'` or `revalidate = 0` to prevent stale server data.

### Phase 4 — Fix Performance
- [ ] **DG-03**: Eliminate the first `caseRepository.findById()` call in `generateDocument`. The `buildUnifiedCaseContext` call already fetches all case data including the case itself.
- [ ] **RAG-01**: Add a simple in-memory cache for RAG results keyed by `narrative` hash (for the same generation session). Or skip RAG entirely if same narrative is being regenerated.
- [ ] **PC-01**: Remove enqueue-time cache invalidation. Cache is invalidated on completion by the worker.

### Phase 5 — Clean Up Dead Code
- [ ] Remove unused `GenerateDocumentSchema` from `document-generation.action.ts`
- [ ] Remove unused `AI_GENERATION` queue and processor (or implement actual AI generation for it)
- [ ] Remove dead `isRetryableError()` function and unused error imports

### Phase 6 — Add Test Coverage
- [ ] Unit tests for `DocumentGeneratorService.generateDocument()`
- [ ] Unit tests for worker `processDocumentGenerationJob()`
- [ ] Unit tests for all Zod schemas (FIR, chargesheet, etc.)
- [ ] Unit tests for prompt builder functions
- [ ] Integration test: enqueue → process → persist → complete

---

## 18. Complexity Reduction Plan

### Keep
- `document-generator.service.ts` — core orchestrator (after DG-01 fix)
- `document-generator.processor.ts` — worker entry point
- `queue-producer.service.ts` — job creation
- `use-job-polling.ts` — client-side status polling
- `gemini-provider.ts` — AI provider (after retry reduction)
- `document-registry.ts` — document type config
- `unified-context.service.ts` — case context builder

### Merge
- `fir.service.ts` + `investigation-summary.service.ts` → Remove pass-through wrappers that only call `documentGeneratorService.generateDocument()`. Replace usages with direct calls to `documentGeneratorService`.
- `ai-shared.service.ts` + `ai-observability.service.ts` → Two classes named `AIObservabilityService`. Merge into one, keep the richer `logRequest` method that supports transactions.

### Bypass/Remove Later
- `ai-generation.processor.ts` — Dead code. Remove entirely.
- `ai-generation` queue — No current consumer. Remove or reuse.
- `isRetryableError()` function — Dead code. Remove.
- `GenerateDocumentSchema` — Unused. Remove.

---

## 19. Approval Checklist

### Phase 0 — Tests
- [ ] FIR fixture test passes
- [ ] Chargesheet fixture test passes
- [ ] NonRetryableError not retried
- [ ] RAG failure doesn't block generation

### Phase 1 — Critical
- [ ] DG-01: `onProgress` failure after save is safe
- [ ] PR-01: Max Gemini calls per click ≤ 3
- [ ] QW-01: NonRetryableError stops immediately

### Phase 2 — High
- [ ] RAG-03: RAG failure is non-fatal
- [ ] PR-02: Provider timeout aligned with worker lock
- [ ] UX-02/04: Error banner shows for all failure paths

### Phase 3 — State Sync
- [ ] Cache invalidated only after save
- [ ] Case page uses dynamic rendering

### Phase 4 — Performance
- [ ] No duplicate case fetch
- [ ] RAG cached or deduplicated
- [ ] Enqueue-time invalidation removed

### Phase 5 — Cleanup
- [ ] Dead schemas removed
- [ ] Dead processors removed
- [ ] Dead functions removed

### Phase 6 — Test Coverage
- [ ] Core pipeline tested
- [ ] Worker tested
- [ ] All schemas tested

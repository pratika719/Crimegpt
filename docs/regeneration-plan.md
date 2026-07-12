# Document Regeneration — Debug Plan

## 🕵️ Root Causes Found

### Bug R-01: 429 (Quota/Rate-Limit) From Gemini Not Handled

**Current flow when Gemini returns 429:**
1. Gemini provider **retries internally 3×** (429 is marked retryable)
2. After 3× retries → throws `AIProviderError("Gemini API call failed after 3 retries. Reason: 429 Too Many Requests")`
3. Worker catch → checks `isFinal` → re-throws
4. BullMQ sees plain `Error` → **retries 3 more times**
5. Max total: **9 Gemini calls** per user click
6. UI shows: *"Generation failed: Gemini API call failed after 3 retries. Reason: 429..."*

**Problems:**
- Raw error shown to user — not actionable
- 9× quota waste on overload
- User can't tell if it's temporary (retry later) vs permanent

**Fix:**
- Detect 429 in worker catch block → set user-friendly message
- Don't waste BullMQ retries on quota errors (discard on 429)

### Bug R-02: Version Mismatch on Regeneration

**Current regeneration flow:**
1. User clicks "Regenerate" → `forceRegenerate: true`
2. Queue producer creates **unique jobId** with `Date.now()` appended
3. New **requestId** generated per job
4. Worker calls `generateDocument(caseId, userId, type, requestId)`
5. Inside transaction, version logic:
   - Searches for doc with `content._requestId === requestId` → **NOT FOUND** (brand new requestId)
   - Falls to `findLatestByType` → increments → creates **new version**
6. Regenerating 3× → versions 1, 2, 3, 4 exist — user expects overwrite

**Root cause**: `forceRegenerate` creates new `requestId` per job, but the idempotency check is designed for retries (same requestId). Regeneration should either:
- Reuse a deterministic requestId based on caseId+type, OR
- Delete existing docs of that type before creating

### Bug R-03: Worker doesn't discard `NonRetryableError`

Validation errors like "Case not found" or "No accused/victim" throw `NonRetryableError`, but the worker re-throws it to BullMQ without calling `job.discard()`. BullMQ retries 3× on these permanent errors.

### Bug R-04: `enrichContext` called twice

The `generateDocument` method calls `this.enrichContext(context)` at line 90 AND again at line 109. Wasteful.

### Bug R-05: UI action failures don't show persistent error banner

When the server action itself fails (queue down, validation, rate limit), the UI shows a toast but doesn't set `generationError`. No persistent banner = user can miss the error.

---

## ✅ Proposed Changes (7 files, minimal)

| # | File | Change | Complexity |
|---|------|--------|------------|
| **R-01a** | `gemini-provider.ts` | Detect 429 in catch → throw `AIProviderError` with `statusCode: 429` metadata | Trivial |
| **R-01b** | `document-generator.processor.ts` | Check for 429 in catch → `job.discard()` + set user-friendly message `"AI service is currently overloaded. Please wait a moment and try again."` | Low |
| **R-01c** | `case-analysis-panel.tsx` | Map 429 error messages to user-friendly display | Trivial |
| **R-02** | `document-generator.service.ts` | For `forceRegenerate` path: delete existing docs of same type before creating new one, reuse version number | Low |
| **R-03** | `document-generator.processor.ts` | Catch `NonRetryableError` → `job.discard()` before re-throwing | Trivial |
| **R-04** | `document-generator.service.ts` | Remove duplicate `enrichContext()` call (line 109) | Trivial |
| **R-05** | `case-analysis-panel.tsx` | Set `generationError` on action failures for persistent banner | Trivial |

### What's NOT changing
- No new dependencies
- No new files
- No new queues or services
- No prompt changes
- No AI provider swaps
- No schema changes

---

## 🔢 Summarizing What This Fixes

| Before | After |
|--------|-------|
| 429 → raw error toast + 9 wasted API calls | 429 → "AI is overloaded, try again" + job discarded immediately |
| Regenerate → creates version N+1 each time | Regenerate → replaces existing version (keeps version number) |
| Validation errors retried 3× by BullMQ | Validation errors discarded immediately |
| `enrichContext` called twice | `enrichContext` called once |
| Action failure → toast only, easy to miss | Action failure → persistent error banner + toast |

---

**Do you approve this plan?** Once approved, I'll implement all changes sequentially.

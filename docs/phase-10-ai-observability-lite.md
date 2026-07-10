# Phase 10 — AI Observability Lite

## Goal
Implement a minimal, lightweight telemetry logging mechanism for Gemini-powered document-generation background jobs in CrimeGPT v2. This enables basic operational auditing (success rate, execution latency, and error tracking) without database bloat.

## Why This Exists
To provide platform reliability metrics and quick debugging hooks. Without observability:
1. Failed background jobs cannot easily be analyzed to inspect API/model failures.
2. We cannot measure average generation latency across document types.
3. We lack a history of which user/case triggered a particular LLM generation job.

## What We Track
We store only minimal, structured metadata:
- `caseId` (associated case identifier)
- `userId` (user who triggered the run)
- `queueJobId` (associated BullMQ job ID)
- `requestType` (document/request type)
- `modelUsed` (Gemini model name, e.g., `gemini-2.5-flash`)
- `status` (SUCCESS or FAILED)
- `latencyMs` (elapsed execution time in milliseconds)
- `retrievedChunksCount` (number of legal chunks retrieved, default to `null` for non-RAG jobs)
- `cacheHit` (boolean cache indicators)
- `failureReason` (truncated text containing error message)
- `createdAt` / `updatedAt` (execution timestamps)

## What We Intentionally Do Not Track
To prevent high-write overhead and database bloat:
- Full prompt string
- Raw Gemini API response body
- Full retrieved chunk text dumps
- Token pricing details or custom pricing analytics

## Data Flow

```txt
User clicks Generate Document
  ↓
Server Action enqueues BullMQ job
  ↓
Worker starts job and timer
  ↓
DocumentGeneratorService runs Gemini/RAG pipeline
  ↓
Success:
    log one SUCCESS AIRequestLog row
    return job result
  ↓
Failure:
    if not final retry attempt → no DB log, rethrow
    if final retry attempt → log one FAILED AIRequestLog row, rethrow
  ↓
Frontend polling shows completed/failed state
```

## Success Logging Flow
When a background job succeeds, `processDocumentGenerationJob` in the BullMQ worker calls `aiObservabilityService.logSuccess()`. This records a single `SUCCESS` row inside `AIRequestLog`. Standard transaction-level duplicate logs inside `DocumentGeneratorService` are suppressed during background execution to ensure exactly one log is recorded.

## Failure Logging Flow
When a background job throws an error, the BullMQ worker catches it. It compares `job.attemptsMade` against the total allowed `attempts`. Only when it reaches the final failure does it record a single `FAILED` row containing the error reason (truncated to 1000 characters) via `aiObservabilityService.logFailure()`.

## Retry Interaction
To avoid database noise during transient network failures:
1. Attempt 1 (Failure) -> Redis increments attempts, no database log written.
2. Attempt 2 (Failure) -> Redis increments attempts, no database log written.
3. Attempt 3 (Final Failure) -> Observability writes one `FAILED` database row.
4. If Attempt 2 succeeds -> Observability writes one `SUCCESS` database row.

This ensures that we maintain a clean 1:1 relationship between final background job status and observability rows.

## Database Cleanliness
We avoid large JSON fields and text blobs. Stored fields are strictly scalar values.

## Manual Test Plan

### Test 1 — Successful AI Generation
1. Launch the server and worker:
   ```powershell
   npm run dev
   npm run worker:dev
   ```
2. Trigger the generation of an FIR or Investigation Summary.
3. Confirm the job completes successfully.
4. Query the database to check the new `AIRequestLog` row:
   ```sql
   SELECT id, status, "queueJobId", "requestType", "latencyMs" 
   FROM "AIRequestLog" 
   ORDER BY "createdAt" DESC LIMIT 1;
   ```
5. Verify `status` is `SUCCEEDED` (mapped from `SUCCESS`) and `prompt` / `response` fields are empty.

### Test 2 — Failed Final Attempt
1. Break the model connection or set an invalid API key in `.env`.
2. Trigger generation.
3. Observe worker retries (up to 3 times).
4. Verify that only a single `FAILED` row is created, capturing the error message truncated to 1000 characters.

## Future Improvements
- Integrate OpenTelemetry for tracing across microservices in Phase 11.
- Introduce aggregate dashboards for latency and token costs.

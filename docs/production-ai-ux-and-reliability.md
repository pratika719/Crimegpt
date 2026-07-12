# Production AI UX And Reliability

## Problem Summary

CrimeGPT document generation depends on Gemini, Redis/BullMQ, PostgreSQL, PGVector, and the FastAPI embedding service. On free deployment tiers, the two biggest production risks are Gemini quota exhaustion and embedding service cold starts. Users also need clear guidance when a case is missing required data before an AI document can be drafted.

## Gemini Quota Handling

Gemini quota errors are classified centrally as `quota_error`. Detection includes HTTP 429, `Too Many Requests`, `Quota exceeded`, `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, and related free-tier quota strings.

The user-facing message is:

```txt
AI quota limit reached for today. Please try again later.
```

## Why Quota Errors Are Non-Retryable

Daily free-tier quota exhaustion cannot be fixed by immediate retries. Retrying wastes the remaining provider budget and makes jobs slower. Quota and provider auth errors now fail fast and are marked non-retryable.

## Render/FastAPI Cold Start Behavior

The FastAPI embedding service may return 502/503/504 or time out while a free Render service wakes up. These failures are classified as `embedding_service_unavailable` and remain retryable.

The user-facing message is:

```txt
AI service is warming up. Please wait and try again shortly.
```

## Embedding Retry/Warmup Strategy

The FastAPI embedding provider uses `EMBEDDING_SERVICE_URL`, checks `GET /health`, then calls `POST /embed`. It retries transient warmup failures with bounded backoff:

- attempt 1: immediate
- attempt 2: wait 5 seconds
- attempt 3: wait 10 seconds
- attempt 4: wait 20 seconds

`EMBEDDING_REQUEST_TIMEOUT_MS` defaults to `90000`.

External HTML/error bodies are truncated to 300 characters in logs.

## Document Preconditions

Before enqueueing expensive AI jobs, the document generation request service validates case ownership and obvious document requirements.

FIR requires at least one victim/complainant source. If missing:

```txt
Add at least one victim/complainant before generating an FIR.
```

Chargesheet requires at least one accused/suspect source. If missing:

```txt
Add at least one accused/suspect before generating a chargesheet.
```

Validation happens in the service layer before a BullMQ job is enqueued.

## Document Reuse/Regeneration Behavior

Normal generation first checks for an existing generated document with the same case and document type. If found, no Gemini call is made and no new job is enqueued.

The UI receives:

- `existingDocumentFound`
- `documentId`
- `message`

Regeneration requires `forceRegenerate=true`, passes rate limits, and uses a unique job id.

## App-Level AI Rate Limits

Redis daily limits protect Gemini quota before expensive jobs are enqueued.

Defaults:

```env
AI_DOCUMENT_DAILY_LIMIT=5
AI_REGENERATE_DAILY_LIMIT=2
```

Keys:

```txt
rate-limit:ai-doc-generation:{userId}:{yyyy-mm-dd}
rate-limit:ai-doc-regenerate:{userId}:{yyyy-mm-dd}
```

If exceeded, the user sees:

```txt
Daily AI generation limit reached. Please try again tomorrow.
```

## Job Progress UX

The document worker reports structured progress:

```ts
{
  stage: "retrieving_legal_context",
  message: "Retrieving legal context",
  percentage: 35
}
```

Stages:

- queued: 5
- validating: 10
- warming_ai_service: 20
- retrieving_legal_context: 35
- generating_document: 65
- saving_document: 90
- completed: 100
- failed: 100

The job status service returns `stage`, `message`, `percentage`, `failedReason`, and `retryable` for the UI polling hook.

## Env Vars Added

```env
GEMINI_MODEL=gemini-2.0-flash
AI_DOCUMENT_DAILY_LIMIT=5
AI_REGENERATE_DAILY_LIMIT=2
EMBEDDING_REQUEST_TIMEOUT_MS=90000
LAW_RETRIEVAL_TOP_K=4
```

These are optional tuning variables with safe defaults.

## Manual Test Checklist

- Try chargesheet generation on a case without accused/suspect. Confirm no job is enqueued and the UI shows the clean accused message.
- Try FIR generation on a case without victim/complainant. Confirm no job is enqueued and the UI shows the clean victim message.
- Generate a document once, then generate again without regeneration. Confirm no new job is queued and the UI says the document already exists.
- Simulate Gemini 429 quota exceeded. Confirm no provider retry loop and the job fails quickly with the quota message.
- Simulate FastAPI 502/503/504. Confirm retries happen with backoff and logs truncate external response bodies.
- Confirm successful document generation enqueues quickly, progresses through stages, and refreshes documents on completion.
- Confirm architecture remains Server Actions -> Services -> Repositories, with AI generation in BullMQ workers.

## Known Deployment Limitation

On free deployment tiers, AI services may take 20-60 seconds to wake up.
# Phase 9 — Retry Strategy

## Goal

To ensure that background tasks processed via BullMQ queues recover safely from transient failures without duplicating jobs, creating duplicate documents, or leaving corrupted partial records.

## Why Retries Are Needed

In production, integrations with external AI providers (like Gemini) or adjacent microservices (like FastAPI embedding service) can fail temporarily due to:
- Network socket timeouts / ECONNRESET
- API rate limits (HTTP 429)
- Remote service outages (HTTP 502/503/504)
- Server/Worker restarts during job processing

Without a robust retry strategy, these temporary hiccups result in permanent job failures, leading to poor user experience, incomplete data, and unnecessary manual retries.

## Background Job Flow

```txt
User clicks Generate Document
  ↓
Server Action enqueues job
  ↓
QueueProducerService creates safe deterministic job ID
  ↓
If same job is already waiting/active/delayed → reuse it
  ↓
Worker processes job
  ↓
Temporary failure → throw error → BullMQ retries with exponential backoff
  ↓
Permanent invalid payload → NonRetryableError → failed cleanly
  ↓
Success → idempotent document save
  ↓
UI polls status and shows completed/failed
```

## Retry Policy

We have established centralized retry policies in [retry-policy.ts](file:///d:/crimegpt/src/lib/queue/retry-policy.ts) with backoff definitions tailored to each task's operational footprint:

| Queue | Attempts | Backoff Type | Base Delay |
| :--- | :--- | :--- | :--- |
| **Document Generation** | 3 | Exponential | 5,000ms |
| **Embedding** | 3 | Exponential | 3,000ms |
| **Ingestion** | 3 | Exponential | 3,000ms |
| **AI Generation** | 3 | Exponential | 5,000ms |
| **Email** | 3 | Exponential | 5,000ms |
| **Cleanup** | 2 | Exponential | 10,000ms |

## Exponential Backoff

By using exponential backoff, we prevent hammering downstream services during an outage. If a service is down, the delay between retries increases exponentially (e.g. 5s -> 10s -> 20s), allowing the external service time to recover.

## Job Deduplication

Duplicate job submissions are prevented using two mechanisms:
1. **Deduplication on Submission**: Custom deterministic job IDs are computed for each request.
2. **State Checking**: If a request comes in for a job ID that is currently in a `waiting`, `active`, or `delayed` state, the producer reuses the existing job instead of enqueuing a duplicate task.
3. **Stale Job Eviction**: When a new request is made, any stale job matching the deterministic ID that is in a `completed` or `failed` state is cleanly deleted before a new job is registered.

## Safe Job IDs

To comply with BullMQ requirements, we route all custom job ID generation through [job-id.ts](file:///d:/crimegpt/src/lib/queue/job-id.ts). This utility formats segments cleanly, ensuring that no custom job IDs contain invalid characters (like `:` colons), replacing them with double underscores (`__`).

## Idempotency

When a job is retried, it runs the entire process from the beginning. To prevent multiple attempts from writing duplicate document records or versions to the database, we use a request-scoped `_requestId` saved inside the generated document content:
- **Deduplication Check**: Before writing, the database transaction checks if a document matching the active `caseId`, `type`, and `_requestId` already exists.
- **Atomic Overwrite**: If it exists, the transaction removes the previous matching record and overwrites it (maintaining the same version number), preventing version duplication or partial corruption.

## Retryable vs Non-Retryable Errors

We classify failures cleanly using [retryable-error.ts](file:///d:/crimegpt/src/lib/error/retryable-error.ts):
- **Non-Retryable Errors**: Throw `NonRetryableError` for invalid parameters, empty payloads, or unsupported tasks. BullMQ will skip subsequent attempts and fail the job immediately.
- **Retryable Errors**: Standard network exceptions, timeouts, rate limits, or explicitly thrown `RetryableError` instances bubble up normally. BullMQ catches these and schedules a retry according to the queue backoff policy.

## Failed Job Handling

When a job exhausts all retries or encounters a `NonRetryableError`, it transitions to `failed` and records the `failedReason`. This is queried normally by the Phase 8 polling status check actions to render error states directly to the user.

## What We Did Not Build

To keep the scope minimal, we did not include:
- A separate dead-letter queue (DLQ) dashboard.
- Bull Board or queue admin control pages.
- WebSockets or SSE for status pushing.
- UI elements to manually trigger retries.

## Manual Test Plan

1. **Active Job Reuse**: Trigger document generation and click the button again immediately. Verify that only one background job runs and only one document is created.
2. **Regeneration**: Allow a document to generate fully, then click "Regenerate". Confirm that the old job is evicted and a new job starts.
3. **Transient Failure Recovery**: Shut down the FastAPI embedding service, queue an embedding task, watch it fail and wait for retry, then start FastAPI and check that the retry succeeds.
4. **Invalid Payload**: Queue a generation job missing a `caseId`. Confirm the job fails immediately with `NonRetryableError` and does not attempt any retries.

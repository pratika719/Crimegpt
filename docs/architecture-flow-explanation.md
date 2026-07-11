# Unified Background Generation & Retry Architecture

This document provides a comprehensive deep-dive into the end-to-end architecture of CrimeGPT v2's background generation, status polling, and retry mechanisms.

---

## 1. High-Level Architectural Flow

The background execution flow is decoupled across several layers to ensure high responsiveness, consistency, and resilience:

```txt
[Client Browser]
  │  (1) clicks generate
  ▼
[Server Action: generateDocumentAction] 
  │  (2) validates payload
  ▼
[QueueProducerService]
  │  (3) deduplicates & creates safe job ID
  ▼
[BullMQ / Redis Queue]
  │
  ├─► (4) Worker (document-generator.processor)
  │         │  (5) runs validations (NonRetryableError if invalid)
  │         ▼
  │       [DocumentGeneratorService]
  │         │  (6) retrieves context (FastAPI / laws retriever)
  │         │  (7) calls Gemini AI
  │         │  (8) runs db transaction (idempotently overwrites if retry)
  │         ▼
  │       [PostgreSQL Database]
  │
  └─► (9) Client Polls getJobStatusAction (every 5 seconds)
            │  (10) reads job status from Redis
            ▼
          [Client UI] transitions to success / error
```

---

## 2. Code-Level Step-by-Step Explanation

### Step 1: Client Triggers Generation
In [case-analysis-panel.tsx](file:///d:/crimegpt/src/components/case/case-analysis-panel.tsx), clicking the "Generate Document" button triggers `handleGenerate()`:
- It locks UI state by setting `generatingJobs` for that type.
- Calls `generateDocumentAction` (Next.js Server Action) asynchronously.
- Receives the queued `jobId` and `queueName` immediately.

```typescript
const jobData = response.data;
setGeneratingJobs((prev) => ({
  ...prev,
  [type]: { jobId: jobData.jobId, queueName: jobData.queueName }
}));
```

---

### Step 2: Enqueueing & Job Deduplication
In [queue-producer.service.ts](file:///d:/crimegpt/src/services/queue/queue-producer.service.ts), `addDocumentGenerationJob()` is responsible for:
- Computing a safe, colon-free job ID using `createSafeJobId()`.
- Checking if a job with this ID is already waiting or active in Redis.
- Evicting any completed/failed old jobs to allow clean regeneration.

```typescript
const baseJobId = createSafeJobId(["document-generation", input.caseId, input.documentType]);
const existingJob = await documentGenerationQueue.getJob(baseJobId);

if (existingJob) {
  const state = await existingJob.getState();
  if (state === "waiting" || state === "active" || state === "delayed") {
    return { jobId: String(existingJob.id), queueName: QUEUE_NAMES.DOCUMENT_GENERATION, reused: true, state };
  }
  if (state === "completed" || state === "failed") {
    await existingJob.remove(); // evict old job
  }
}
```

---

### Step 3: Background Worker Processing
In [document-generator.processor.ts](file:///d:/crimegpt/src/workers/document-generator.processor.ts), the BullMQ worker picks up the job and:
- Validates the payload. If mandatory fields (`caseId`, `userId`, `documentType`) are missing, it throws a `NonRetryableError` immediately.
- Reports initial status stages to Redis cache via `setAITempState()` to update the UI.
- Delegates core logic to the generator service.

```typescript
if (!caseId) {
  throw new NonRetryableError("Document generation job missing caseId.");
}
const result = await documentGeneratorService.generateDocument(caseId, userId, documentType, requestId);
```

---

### Step 4: Idempotent Database Transactions
In [document-generator.service.ts](file:///d:/crimegpt/src/services/document-engine/document-generator.service.ts), document saving is wrapped in a pessimistic lock transaction:
- **Idempotency Overwrite**: To prevent duplicate versions during worker retries, the code searches for any existing document carrying the request-scoped `_requestId` inside its `content` JSON.
- If a match is found, it deletes the outdated matching row and overwrites it under the same version number.
- Otherwise, it queries `findLatestByType()` to increment the version number.

```typescript
let nextVer = 1;
if (requestId) {
  const docs = await tx.generatedDocument.findMany({ where: { caseId, type } });
  const existingDoc = docs.find((d: any) => d.content?._requestId === requestId);

  if (existingDoc) {
    nextVer = existingDoc.version;
    await tx.generatedDocument.delete({ where: { id: existingDoc.id } }); // remove previous retry draft
  } else {
    const latestDoc = await documentRepository.findLatestByType(caseId, userId, type, tx);
    nextVer = latestDoc ? latestDoc.version + 1 : 1;
  }
}
```

---

### Step 5: Active Job Polling
On the client, the [use-job-polling.ts](file:///d:/crimegpt/src/hooks/use-job-polling.ts) hook starts:
- Executes `getJobStatusAction` every 5 seconds.
- Stops the loop once it reads a finished status (`completed`, `failed`, or `unknown`).
- Over on [case-analysis-panel.tsx](file:///d:/crimegpt/src/components/case/case-analysis-panel.tsx), detecting `completed` prompts `router.refresh()` which re-fetches server props and renders the preview pane dynamically.

```typescript
const state = jobStatus.state;
if (state === "completed" || state === "failed" || state === "unknown") {
  setIsPolling(false);
  return;
}
window.setTimeout(poll, intervalMs);
```

---

## 3. Error Handling & Retry Classification

Our architecture handles failures gracefully depending on their classification inside [retryable-error.ts](file:///d:/crimegpt/src/lib/error/retryable-error.ts):

1. **Retryable Failures** (Network timeouts, HTTP 502/503/504, rate limits):
   - Thrown normally in processors/services.
   - Caught by BullMQ, which schedules a retry using exponential backoff (e.g. `5000ms * 2^attempt`).
2. **Non-Retryable Failures** (Invalid parameters, schema failures, business validation errors):
   - Thrown as `NonRetryableError`.
   - BullMQ recognizes this and fails the job immediately without making further attempts.

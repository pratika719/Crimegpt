# Phase 8 Lite — Job Status UX Flow

## Goal

To provide real-time, lightweight feedback to the client regarding the status of background document generation tasks queued via BullMQ. This ensures that users aren't left waiting without visibility, while avoiding heavy socket solutions.

## Why This Exists

Document generation is a heavy process involving AI models and database commits that can take 15–40 seconds. Forcing users to wait on a blocking HTTP request harms responsiveness. By offloading tasks to background workers, we let the client proceed immediately, checking the status asynchronously.

## High-Level Architecture

```txt
User clicks Generate Document
  ↓
Client Component (CaseAnalysisPanel)
  ↓
generateDocumentAction()
  ↓
QueueProducerService
  ↓
BullMQ / Redis
  ↓
Worker processes document generation
  ↓
Client polls getJobStatusAction() every 5 seconds
  ↓
JobStatusService reads BullMQ job state
  ↓
UI shows queued / active / completed / failed
```

## Full Data Flow

1. **Intake**: A user clicks the "Generate Document" or "Regenerate" button for a document type (e.g. FIR).
2. **Enqueueing**: The client calls `generateDocumentAction()`. The action hands the request to `QueueProducerService.addDocumentGenerationJob()`, which writes it to the BullMQ redis queue and returns the `jobId` and `queueName`.
3. **Tracking**: The client component receives the `jobId` and `queueName` and stores them in the `generatingJobs` state.
4. **Polling**: The `useJobPolling` hook initializes, launching a status checking cycle every 5 seconds.
5. **Background Work**: Meanwhile, the BullMQ worker picks up the job and begins drafting the document via the AI provider, saving the result to the DB on completion.
6. **Resolution**: On the next status poll, the status transitions to `completed` or `failed`. The client stops polling and triggers `router.refresh()`, loading the newly drafted document version dynamically.

## Request Flow

1. **POST** `/api/actions/generateDocumentAction` -> returns `{ success: true, data: { jobId, queueName } }`
2. **POST** `/api/actions/getJobStatusAction` -> returns `{ success: true, data: { jobId, queueName, state: "waiting" } }`
3. **POST** `/api/actions/getJobStatusAction` -> returns `{ success: true, data: { jobId, queueName, state: "active" } }`
4. **POST** `/api/actions/getJobStatusAction` -> returns `{ success: true, data: { jobId, queueName, state: "completed" } }`

## Polling Flow

The polling is active only when a job is running:
- Starts only if `enabled`, `jobId`, and `queueName` are present.
- Polls every 5 seconds.
- Stops immediately if `state` is `"completed"`, `"failed"`, or `"unknown"`.
- Stops immediately on component unmount (using `useEffect` cleanups).

## Backend Files

* [job-status.service.ts](file:///d:/crimegpt/src/services/queue/job-status.service.ts): Reads the state, failed reason, and return value of a job directly from the target BullMQ queue and maps it to `MinimalJobStatusResponse`.
* [job-status.actions.ts](file:///d:/crimegpt/src/actions/job-status.actions.ts): Validates client input, authenticates the session, calls `JobStatusService`, and returns a standardized response.

## Frontend Files

* [use-job-polling.ts](file:///d:/crimegpt/src/hooks/use-job-polling.ts): Client-side React hook managing the setTimeout loop, keeping track of active states, errors, and cancellation events.
* [case-analysis-panel.tsx](file:///d:/crimegpt/src/components/case/case-analysis-panel.tsx): Feeds active job parameters to the hook, disables buttons to prevent duplicate runs, displays real-time status banners, and triggers page revalidation upon success.

## State Transitions

- **waiting**: Job is enqueued, sitting in BullMQ. UI displays: `Document generation is queued.`
- **active**: Job is actively running in the worker. UI displays: `Document is generating in the background.`
- **completed**: Job successfully drafted the file. UI displays: `Document generated successfully. Refreshing documents...`
- **failed**: Job failed. UI displays: `Generation failed: <reason>`
- **unknown**: Job cannot be located or queue is invalid. UI displays: `Generation status: <error>`

## Why 5-Second Polling

- **Low Server Overhead**: A single user generating a document produces ~6–8 requests total, negligible for the Redis and server instance.
- **Simplicity**: Far less complex to test, implement, and maintain than persistent WebSockets or SSE connections.
- **Great UX**: 5 seconds is perfectly responsive for a document drafting phase that naturally requires 20–40 seconds.

## What We Did Not Implement

To maintain a lean footprint and adhere strictly to Phase 8 Lite guidelines, we intentionally skipped:
- Progress bars or percentage progress loaders (using BullMQ state transitions instead).
- Manual status check buttons.
- WebSocket or Server-Sent Events (SSE) connections.
- Job control dashboards or administrator board pages.
- Evidence processing or new extraction pipeline pipelines.

## Testing Checklist

- [x] Run `generateDocumentAction` and verify it returns a `jobId` and `queueName`.
- [x] Start worker, click generate, verify polling cycle is started and triggered every 5 seconds.
- [x] Confirm buttons are disabled during generation.
- [x] Verify state transition text shows up on the screen (waiting -> active -> completed).
- [x] Verify polling stops on completion and triggers a `router.refresh()` to show the document.
- [x] Test switching tabs and check that the drafting status is preserved in the left-hand navigation list.

## Future Improvements

- Incorporate partial status text updates if background tasks report specific processing stages (e.g. "RAG Retrieval", "AI Formulation", "PDF Formatting").
- Implement automatic backoff if polling takes too long (e.g., polling slower if job remains active for > 2 minutes).
- Set up a dead-letter queue (DLQ) notifications dashboard.

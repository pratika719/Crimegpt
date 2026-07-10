# Phase 11 — Structured Logging

## Goal
Implement modern, structured JSON-based logging across all runtime paths using `pino` and `pino-pretty` to simplify production debugging, runtime auditing, and system monitoring.

## Why Structured Logging Exists
Traditional unstructured console logs (e.g. `console.log`) are difficult to search, parse, and monitor at scale. By using structured JSON logs, log ingestion tools (like ELK, Datadog, or cloud providers) can automatically index metadata fields.

## Logger Library
We use `pino` for low-overhead JSON logging, and `pino-pretty` as a local dev dependency to output colorized, human-readable terminal logs in non-production environments.

## Environment Variables
The logging behavior is driven by the following environment variables:
- `LOG_LEVEL`: Determines the minimum log level to output (`trace`, `debug`, `info`, `warn`, `error`, `fatal`). Defaults to `debug` in development, `info` in production.
- `SERVICE_NAME`: The identifier for the logging component. Defaults to `crimegpt-app` for Server Actions/API and `crimegpt-worker` for the background processor.
- `PINO_PRETTY`: Set to `true` to enable colorized pretty logs locally.

## Log Levels
- `info`: Regular operational logs (e.g. worker starting, job enqueued, job completed).
- `warn`: Recoverable warnings (e.g. failed to write DB observability log).
- `error`: Unexpected exceptions/failures (e.g. background job failed, Gemini API call failed).
- `fatal`: Process-stopping exceptions (e.g. worker startup crashes).

## Standard Context Fields
Every log output carries:
- `time`: ISO timestamp
- `service`: `crimegpt-app` or `crimegpt-worker`
- `environment`: `development` or `production`
- `jobId`: BullMQ job ID
- `queueName`: BullMQ queue name
- `caseId`: Case ID context
- `userId`: User ID context
- `documentType`: Document type generated (e.g. `FIR`, `CHARGE_SHEET`)
- `attempt` / `maxAttempts`: Execution attempt metrics
- `latencyMs`: Elapsed run duration

## Worker Logging Flow
```txt
User clicks Generate Document
  ↓
Server Action logs document generation request
  ↓
QueueProducer logs job enqueue or reuse
  ↓
Worker logs job started
  ↓
AI/RAG pipeline runs
  ↓
Worker logs completed or failed
  ↓
AIObservabilityService writes clean DB metadata
  ↓
If observability write fails, logger.warn records it without breaking the job
```

## Queue Producer Logging Flow
When enqueuing jobs in the background (or reusing active jobs), `QueueProducerService` logs enqueues/reuses with jobId, queueName, caseId, userId, and documentType context.

## Server Action Logging Flow
Server actions log request starts and failures. They do NOT log successful polls of the job status action to prevent log spam in production.

## AI Provider Logging Flow
FastAPI and Gemini embedding/AI providers log structured exceptions when external requests fail, capturing text counts and model names, without logging full prompts or payloads.

## Sensitive Data Redaction
Pino is configured to automatically redact credentials and sensitive variables to prevent leakage:
- `password`
- `token`, `accessToken`, `refreshToken`
- `authorization` headers
- `cookie` headers
- `DATABASE_URL`
- `REDIS_URL`
- `GEMINI_API_KEY`
- `AUTH_SECRET`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`

## What We Do Not Log
- Full prompts
- Full Gemini response JSONs
- Generated document output
- Full retrieved chunk text
- Cookies / passwords / secrets
- Environment variables in full

## Manual Test Plan
1. Start local dev and worker:
   ```powershell
   npm run dev
   npm run worker:dev
   ```
2. Verify logs print as colorized pretty logs.
3. Queue a document generation. Verify logs trace the enqueued, started, completed flow.
4. Simulate a failure (e.g. remove model api key) and verify that the `err` object is printed structurally on the final attempt.

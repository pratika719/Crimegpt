# Phase 12 — Health Checks

## Goal
Establish a robust, production-ready health monitoring system to query and audit the status of Next.js, PostgreSQL, Redis, BullMQ queues, FastAPI embedding service, PGVector extension availability, and Gemini configuration.

## Why Health Checks Exist
To ensure high system availability, automated container orchestration tools (like Kubernetes, AWS ECS, or PM2) require endpoints to check:
1. **Liveness**: Is the web server listening?
2. **Readiness**: Are vital dependencies (Postgres, Redis) accessible?
3. **Deep Diagnostics**: Are vector extensions and external AI APIs configured and fully responsive?

## Health Routes

### `/api/health`
Basic liveness route. Publicly accessible. Checks only whether the Next.js runtime is running.
- **Method**: `GET`
- **Authentication**: None
- **Response**: `200 OK`

### `/api/health/ready`
Readiness check. Validates environment, PostgreSQL, Redis, FastAPI, and embedding provider configurations.
- **Method**: `GET`
- **Authentication**: None
- **Response**: `200 OK` when ready, `503 Service Unavailable` if any check fails.

### `/api/health/deep`
Deep diagnostic check. Validates env variables, Postgres, Redis, BullMQ queue sizes, FastAPI embedding connection, PGVector installation, and Gemini API setup.
- **Method**: `GET`
- **Authentication**: Requires a header named `x-healthcheck-secret` in production. Allows request in development if `HEALTHCHECK_SECRET` is unset.
- **Response**: `200 OK` when fully healthy, `503 Service Unavailable` on failures.

## Dependencies Checked
- **env**: Confirms presence of required keys.
- **database**: Queries postgres using `SELECT 1` inside a transaction.
- **redis**: Pings Redis connection (`PING` -> `PONG`).
- **queues**: Queries job counts (waiting, active, completed, failed, delayed) on BullMQ.
- **fastapi**: Fetches `/health` on FastAPI embedding service.
- **pgvector**: Validates extension availability in PG extensions.
- **geminiConfig**: Confirms GEMINI API key is loaded.
- **embeddingProvider**: Verifies provider configuration.

## Response Shape Example
```json
{
  "status": "ok",
  "service": "crimegpt-app",
  "environment": "development",
  "timestamp": "2026-07-10T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "message": "PostgreSQL connection is healthy.",
      "latencyMs": 42
    }
  }
}
```

## Status Codes
- `200`: Overall health is `ok` (all checks succeeded).
- `503`: Overall health is `failed` or `degraded` (at least one dependency failed).
- `401`: Unauthorized access to `/api/health/deep`.

## Deep Health Security
The `/api/health/deep` endpoint exposes database extension structures and queue counts. To protect this:
1. In production, `HEALTHCHECK_SECRET` must be set in the environment.
2. The calling client must provide the `x-healthcheck-secret` header. If it does not match, a `401 Unauthorized` is returned.

## Manual Test Plan
1. Start local dev:
   ```powershell
   npm run dev
   ```
2. Run curl to check liveness:
   ```powershell
   curl http://localhost:3000/api/health
   ```
3. Run curl to check readiness:
   ```powershell
   curl http://localhost:3000/api/health/ready
   ```
4. Stop Redis or PostgreSQL and verify that `/api/health/ready` returns `503`.
5. Run curl to verify deep checks authorization:
   - Without header: returns `401` in production.
   - With correct `x-healthcheck-secret` header: returns diagnostic JSON.

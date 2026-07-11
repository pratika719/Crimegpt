# Phase 16 - Docker

## Goal

Make the CrimeGPT v2 Docker setup faster to build, smaller at runtime, and reliable for local production-like runs with Docker Compose.

Phase 16 covers only Docker packaging and runtime wiring for the Next.js app, BullMQ worker, PostgreSQL/PGVector, Redis, Prisma migrations, health endpoints, and the optional FastAPI embedding service.

## Final Docker Strategy

The Next.js app uses `output: "standalone"` and copies the generated standalone server into the final image. The final app image does not copy full development `node_modules`.

The worker uses production dependencies and runs the existing TypeScript entrypoint with `tsx src/workers/index.ts`. It does not run `next build`, does not require a `dist/` worker build, and does not copy the entire repository into the final image.

Both Node images use `node:22-alpine` with `libc6-compat` and `openssl` for native/runtime compatibility.

## Why FastAPI Is Optional In Local Docker

The embedding model image is large and slow to build on Windows/WSL2 because it pulls CPU PyTorch and sentence-transformers. The default local Docker workflow therefore runs FastAPI outside Docker and points containers at:

```txt
EMBEDDING_SERVICE_URL=http://host.docker.internal:8000
```

This keeps normal app and worker rebuilds focused on Node.js layers.

## Services

Default Compose services:

- `postgres`: PostgreSQL 16 with PGVector image.
- `redis`: Redis 7 Alpine.
- `app`: Next.js standalone production server.
- `worker`: BullMQ worker runtime.

Optional Compose profile:

- `embedding-api`: FastAPI embedding service.

## Default Local Mode

Start FastAPI locally on the host first:

```powershell
cd embedding-service
.venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Then start the Docker services:

```powershell
docker compose up -d postgres redis app worker
```

The app is available at:

```txt
http://localhost:3000
```

## Optional Full Docker Embedding Mode

Build and start the optional embedding container with:

```powershell
docker compose --profile embedding up -d
```

When using Dockerized FastAPI, set:

```txt
EMBEDDING_SERVICE_URL=http://embedding-api:8000
```

The default Compose file supports overriding this value from the host environment without reusing the app `.env` value:

```powershell
$env:DOCKER_EMBEDDING_SERVICE_URL="http://embedding-api:8000"
docker compose --profile embedding up -d
```

## Environment Variables

Required runtime variables:

```env
DATABASE_URL=""
REDIS_URL=""
AUTH_SECRET=""
GEMINI_API_KEY=""
EMBEDDING_PROVIDER="fastapi"
EMBEDDING_SERVICE_URL="http://localhost:8000"
HEALTHCHECK_SECRET=""
SERVICE_NAME="crimegpt-app"
LOG_LEVEL="info"
```

Worker concurrency defaults:

```env
DOCUMENT_GENERATION_CONCURRENCY="1"
EMBEDDING_CONCURRENCY="2"
INGESTION_CONCURRENCY="1"
EMAIL_CONCURRENCY="2"
CLEANUP_CONCURRENCY="1"
```

Do not bake real secrets into Docker images. Compose provides runtime values.

## Prisma Migrations In Docker

The app image includes `prisma/`, `prisma.config.ts`, and the minimal Prisma CLI/runtime pieces needed for migration commands.

Run migrations from inside the app container:

```powershell
docker compose exec app npx prisma migrate deploy
```

The Prisma config reads `DATABASE_URL` from the runtime environment using Prisma 7 config `env("DATABASE_URL")`.

A migration enables PGVector on fresh databases:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Health Checks

Liveness:

```powershell
curl http://localhost:3000/api/health
```

Readiness:

```powershell
curl http://localhost:3000/api/health/ready
```

Deep diagnostics:

```powershell
curl -H "x-healthcheck-secret: local-health-secret" http://localhost:3000/api/health/deep
```

FastAPI health:

```powershell
curl http://localhost:8000/health
```

`/api/health/ready` checks database, Redis, FastAPI, and embedding provider configuration. It requires FastAPI to be reachable at the configured `EMBEDDING_SERVICE_URL`.

## Worker Verification

Check worker logs:

```powershell
docker compose logs worker
```

Expected messages include:

```txt
CrimeGPT workers starting...
CrimeGPT workers started.
BullMQ worker ready
```

## Image Size Optimization

App image optimizations:

- Uses Next.js standalone output.
- Avoids copying full development `node_modules`.
- Copies only standalone server, static assets, public assets, Prisma migrations/config, and minimal Prisma CLI/runtime support for migration commands.

Worker image optimizations:

- Uses `npm ci --omit=dev` in the production dependency stage.
- Keeps `tsx` in production dependencies because `worker:start` executes TypeScript directly.
- Avoids `next build` and avoids a separate worker compilation pipeline in Phase 16.
- Copies only `src`, Prisma files, package metadata, and TypeScript config.

FastAPI strategy:

- Default local mode avoids rebuilding the heavy model image.
- Optional Docker mode uses CPU-only torch and pinned lean Python requirements.

## Windows / WSL2 Notes

Docker builds can be slow and build cache can become large on Windows/WSL2. Check disk usage with:

```powershell
docker system df
```

Default local mode is designed to avoid rebuilding the embedding model image during normal app/worker Docker work.

Redis is exposed on host port `6381` to avoid common local conflicts with other Redis instances.

## Common Errors And Fixes

`The datasource.url property is required in your Prisma config file`:

- Confirm `DATABASE_URL` exists in the app container.
- Confirm `prisma.config.ts` exists in the app container.
- Run:

```powershell
docker compose exec app printenv DATABASE_URL
docker compose exec app ls
```

Readiness fails because FastAPI is unreachable:

- In default mode, start FastAPI on the host at port `8000`.
- In Dockerized embedding mode, set `EMBEDDING_SERVICE_URL=http://embedding-api:8000`.

Worker cannot find `tsx`:

- Ensure `tsx` is in `dependencies`, not only `devDependencies`.
- Rebuild worker:

```powershell
docker compose build worker
```

Run final checks:

```powershell
docker compose build app worker
docker compose up -d postgres redis app worker
docker compose ps
docker compose exec app npx prisma migrate deploy
docker compose logs worker
```

## What We Intentionally Did Not Do

- Did not start Phase 17.
- Did not add CI/CD.
- Did not rewrite the app architecture.
- Did not add product features.
- Did not add a separate worker compilation pipeline.
- Did not make Dockerized FastAPI mandatory for local Docker runs.
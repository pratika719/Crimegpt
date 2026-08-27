# CrimeGPT → NestJS Migration Plan

> Goal: Migrate the CrimeGPT backend from Next.js to NestJS, making it a backend engineering showcase with reduced latency and production-grade architecture.

---

## Current Architecture Summary

| Layer | Current (Next.js) | Migration Target (NestJS) |
|---|---|---|
| **API** | Server Actions (`"use server"`) + Route Handlers | REST Controllers + Guards + Interceptors |
| **Auth** | NextAuth v5 (beta) + PrismaAdapter | Passport.js + JWT + Custom Guards |
| **Database** | Prisma + pg Pool singleton | `@nestjs/prisma` + managed connection |
| **Cache** | Custom `CacheService` (Redis) | `@nestjs/cache-manager` + Redis store |
| **Queue** | BullMQ (separate worker process) | `@nestjs/bullmq` (same process or microservice) |
| **AI/RAG** | LangChain + Gemini + PGVector | `@langchain/nestjs` equivalent + NestJS providers |
| **Embedding** | FastAPI sidecar (Python) | Keep as-is or port to NestJS with `@huggingface/transformers` |
| **Logging** | Pino (manual) | `@nestjs/common Logger` + Pino integration |
| **Health** | Manual HTTP server in worker | `@nestjs/terminus` |

---

## Phase 0: Research & Audit ✅ (Done)

**What we found:**
- **10 repositories** (case, evidence, person, document, etc.)
- **14 services** in case domain alone
- **13 server actions** (case CRUD, document generation, evidence, search, audit)
- **6 BullMQ queues** (document-generation, AI-generation, embedding, ingestion, email, cleanup)
- **6 BullMQ workers** with a custom health server
- **3 API route handlers** (health, warmup, auth)
- **Prisma schema** with 15+ models, extensive indexing
- **Cache layer** with pattern-based invalidation
- **FastAPI embedding service** (Python sidecar)

---

## Phase 1: NestJS Project Scaffolding

**Goal:** Create a parallel NestJS project that coexists with the Next.js frontend.

### Target Directory Structure

```
crimegpt-nestjs/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/
│   │   ├── filters/          # Exception filters
│   │   ├── guards/           # Auth, rate-limit
│   │   ├── interceptors/     # Logging, transform, timeout
│   │   ├── pipes/            # Validation (Zod)
│   │   └── decorators/
│   ├── config/               # @nestjs/config
│   ├── prisma/               # PrismaModule
│   ├── redis/                # RedisModule
│   ├── auth/                 # AuthModule
│   ├── case/                 # CaseModule (domain)
│   ├── document/             # DocumentModule
│   ├── evidence/             # EvidenceModule
│   ├── search/               # SearchModule
│   ├── audit/                # AuditModule
│   ├── ai/                   # AIModule (Gemini, LangChain)
│   ├── queue/                # QueueModule (BullMQ)
│   ├── cache/                # CacheModule
│   ├── health/               # HealthModule
│   └── embedding/            # EmbeddingModule
├── prisma/
│   └── schema.prisma
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### Key Actions

1. `npx @nestjs/cli new crimegpt-nestjs --package-manager npm`
2. Install core deps: `@nestjs/config`, `@nestjs/prisma`, `@nestjs/cache-manager`, `@nestjs/bullmq`, `@nestjs/terminus`, `@nestjs/swagger`
3. Copy `prisma/schema.prisma` → verify generation works
4. Set up `AppModule` with `ConfigModule.forRoot({ isGlobal: true })`

---

## Phase 2: Infrastructure Layer

**Goal:** Migrate all infrastructure singletons into NestJS injectable modules.

| Current File | NestJS Module | Notes |
|---|---|---|
| `src/lib/prisma.ts` | `PrismaModule` (global) | Replace pg Pool singleton with `@nestjs/prisma` |
| `src/lib/redis/redis.ts` | `RedisModule` | Wrap IORedis in `@nestjs/platform-redis` or custom provider |
| `src/lib/cache/cache.ts` | `CacheModule` | Use `@nestjs/cache-manager` with Redis store |
| `src/lib/cache/cache-keys.ts` | `CacheKeysService` | Keep as-is, injectable |
| `src/lib/queue/queues.ts` | `BullModule` + `@Processor()` | NestJS BullMQ integration |
| `src/lib/queue/bullmq-connection.ts` | `BullModule.forRoot()` | Single Redis connection via module config |
| `src/lib/logger.ts` | Pino Logger integration | `LoggerModule` with `pino-http` |
| `src/lib/health/health.service.ts` | `@nestjs/terminus` | Replace manual health checks |

### Latency Optimization Opportunities

- Replace `connectRedis()` (lazy, async) with eager connection in module `onModuleInit`
- Use NestJS `APP_FILTER` for global error handling (eliminates try/catch boilerplate)
- Add `APP_INTERCEPTOR` for response transformation

---

## Phase 3: Core Business Domain

**Goal:** Migrate all services and repositories as NestJS providers.

### Pattern Migration

```typescript
// Current: manual instantiation
export class CaseService { ... }
export const caseService = new CaseService();

// NestJS: dependency injection
@Injectable()
export class CaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
}
```

### Module Mapping

| Domain | NestJS Module | Services to Migrate |
|---|---|---|
| Case | `CaseModule` | `case.service.ts`, `activity.service.ts`, `case-metadata.service.ts`, `checklist.service.ts`, `person.service.ts`, `unified-context.service.ts` |
| Document | `DocumentModule` | `document-generator.service.ts`, `document-registry.ts`, `investigation-summary.service.ts`, `investigation-profile.service.ts` |
| Evidence | `EvidenceModule` | `evidence.service.ts`, `evidence-chunking.service.ts`, `evidence-embedding.service.ts`, `evidence-ingestion.service.ts` |
| Legal | `LegalModule` | `legal-analysis.service.ts`, `law.retriever.ts` |
| Audit | `AuditModule` | `audit.action.ts` → controller |
| Search | `SearchModule` | `search.action.ts` → controller |

Each repository becomes an `@Injectable()` service that wraps Prisma calls and stays in the same module.

---

## Phase 4: API Layer (Controllers)

**Goal:** Convert Next.js Server Actions → NestJS REST Controllers.

### Server Action → Endpoint Mapping

| Server Action | HTTP Endpoint | Controller Method |
|---|---|---|
| `createCaseAction` | `POST /api/cases` | `CasesController.create()` |
| `updateCaseAction` | `PATCH /api/cases/:id` | `CasesController.update()` |
| `deleteCaseAction` | `DELETE /api/cases/:id` | `CasesController.remove()` |
| `generateDocumentAction` | `POST /api/cases/:id/documents` | `DocumentsController.generate()` |
| `logDocumentActivityAction` | `POST /api/cases/:id/documents/activity` | `DocumentsController.logActivity()` |
| `getJobStatusAction` | `GET /api/jobs/:jobId` | `JobsController.getStatus()` |
| `searchCasesAction` | `GET /api/search` | `SearchController.search()` |
| Plus 13 more actions | ... | ... |

### Guards & Interceptors

- `AuthGuard` → replaces `requireUser()` in every action
- `RateLimitGuard` → replaces `checkRateLimit()` calls
- `TransformInterceptor` → replaces `actionSuccess()`/`actionFailure()` wrappers
- `TimeoutInterceptor` → for long-running document generation
- `LoggingInterceptor` → replaces manual `logger.info()` in actions

---

## Phase 5: AI/RAG Pipeline

**Goal:** Migrate the Gemini + LangChain + PGVector pipeline into NestJS providers.

| Current | NestJS Equivalent |
|---|---|
| `src/ai/providers/gemini-provider.ts` | `GeminiProvider` injectable |
| `src/ai/retrievers/law.retriever.ts` | `LawRetriever` injectable |
| `src/ai/embeddings/` | `EmbeddingService` |
| `src/ai/chains/` | `LLMChain` providers |
| `src/ai/prompts/` | `PromptTemplateService` |
| `src/ai/ingestion/` | `IngestionService` |
| `src/ai/vector/` | `VectorStoreService` (PGVector) |

### Latency Optimizations

- Pool Gemini connections with connection pooling
- Add response caching at the provider level (not just Redis)
- Use NestJS `@Cron()` for scheduled ingestion instead of manual scripts
- Parallel RAG retrieval with `Promise.allSettled()`

---

## Phase 6: Background Workers

**Goal:** Migrate BullMQ workers into NestJS processor modules.

**Current:** Separate `tsx` process (`src/workers/index.ts`) with manual health server.

### NestJS Approach (Two Options)

**Option A (Recommended): Dedicated Worker Microservice**

```typescript
// worker/main.ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  WorkerModule,
  {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: 10001 },
  },
);
```

**Option B: In-process with `@nestjs/bullmq`**

```typescript
@Processor('document-generation')
export class DocumentGenerationProcessor extends WorkerHost {
  async process(job: Job<DocumentGenerationJobPayload>) {
    // Same logic, but runs in the NestJS process
  }
}
```

### Workers to Migrate

1. `document-generator.processor.ts` → `DocumentGenerationProcessor`
2. `ai-generation.processor.ts` → `AIGenerationProcessor`
3. `embedding.processor.ts` → `EmbeddingProcessor`
4. `ingestion.processor.ts` → `IngestionProcessor`
5. `email.processor.ts` → `EmailProcessor`
6. `cleanup.processor.ts` → `CleanupProcessor`

**Health:** Replace manual `http.createServer()` with `@nestjs/terminus` `TerminusModule`.

---

## Phase 7: Auth & Security

**Goal:** Migrate from NextAuth v5 → Passport.js + JWT.

| Current | NestJS |
|---|---|
| `src/auth.ts` (NextAuth) | `AuthModule` with `PassportModule` + `JwtStrategy` |
| `src/auth.config.ts` | `JwtStrategy` + `GoogleStrategy` |
| `@auth/prisma-adapter` | Custom Prisma session store |
| `requireUser()` (action guard) | `@UseGuards(AuthGuard)` + `@CurrentUser()` decorator |
| `checkRateLimit()` | `@UseGuards(ThrottlerGuard)` via `@nestjs/throttler` |
| `PROMPT_SECURITY_INSTRUCTIONS` | `PromptSecurityInterceptor` or middleware |

---

## Phase 8: Observability & Latency (Showcase Tier)

**Goal:** Make this a backend engineering showcase with production-grade observability.

### Add

- `@nestjs/swagger` — OpenAPI docs auto-generated
- `@nestjs/terminus` — Comprehensive health checks
- Custom `LoggingInterceptor` — Structured JSON logs with request ID correlation
- Custom `MetricsInterceptor` — Response time histograms per endpoint
- `ResponseCompressionInterceptor` — gzip/brotli for large JSON responses
- `CacheInterceptor` with Redis — Per-endpoint response caching
- `@nestjs/schedule` — Cron jobs for cache cleanup, queue monitoring
- Structured error responses with error codes (your `actionFailure` pattern → global exception filter)

### Latency Reduction Strategies

1. Replace `connectRedis()` lazy connections → eager module init
2. Add connection pooling for Prisma (already done, but verify)
3. Response compression for document generation payloads
4. Request deduplication at middleware level (your `inputHash` pattern)
5. Parallel health checks in `/health/deep` endpoint
6. Move from `JSON.stringify` → `fast-json-stringify` for hot paths

---

## Phase 9: Docker & Deployment

**Goal:** Production-ready containerization.

### Updated docker-compose.yml

```yaml
services:
  postgres:     # unchanged
  redis:        # unchanged
  nestjs-app:   # replaces nextjs-app
  nestjs-worker:# replaces separate worker
  embedding-api:# unchanged (Python sidecar)
```

### Changes

- New `Dockerfile` for NestJS (multi-stage build, smaller image)
- Remove Next.js-specific env vars (`NEXTAUTH_SECRET`, `AUTH_URL`)
- Add `TERMINUS_LOG_THRESHOLDS` for health check logging
- Graceful shutdown with `app.enableShutdownHooks()`

---

## Phase 10: Testing & Validation

**Goal:** Verify migration completeness and performance.

### Test Coverage

- Unit tests for all services (you have vitest, add Jest for NestJS)
- E2E tests with `supertest` for every controller
- Integration tests for BullMQ processors
- Load tests comparing Next.js vs NestJS latency

### Validation Checklist

- [ ] All 13 server actions → REST endpoints working
- [ ] All 6 BullMQ queues processing correctly
- [ ] Auth flow (Google OAuth + JWT) working
- [ ] Document generation end-to-end (FIR, Charge Sheet, etc.)
- [ ] RAG pipeline (PGVector retrieval → Gemini generation)
- [ ] Cache invalidation working correctly
- [ ] Health checks returning correct status
- [ ] Docker deployment working

---

## Migration Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10
```

Each phase is independently deployable — you can run NestJS for migrated modules while Next.js still handles the rest via proxy.

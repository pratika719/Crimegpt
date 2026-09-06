# Phase 5: AI/RAG Pipeline — NestJS Migration Implementation Plan

> **Goal:** Migrate the Gemini + LangChain + PGVector pipeline from Next.js singletons into NestJS injectable providers with proper dependency injection, module boundaries, and lifecycle management.

---

## Scope

All AI-related code in `src/ai/` and AI-adjacent services in `src/features/case/services/` that directly invoke LLM calls or vector search. The existing `backend/src/ai/ai.module.ts` and `backend/src/embedding/embedding.module.ts` are empty skeletons awaiting this phase.

---

## 1. Module Structure

```
backend/src/ai/
├── ai.module.ts                          # Root AI module (orchestrator)
├── providers/
│   └── gemini.provider.ts                # Gemini LLM provider (singleton)
├── embeddings/
│   ├── embedding-provider.interface.ts   # CrimeGPTEmbeddingProvider interface
│   ├── fastapi-embedding.provider.ts     # HTTP client to FastAPI sidecar
│   └── embedding.module.ts               # EmbeddingModule (moved from backend/src/embedding/)
├── vector/
│   ├── pgvector.service.ts               # PGVector store singleton + similarity search
│   └── vector.module.ts                  # VectorModule
├── retrievers/
│   └── law-retriever.service.ts          # LawRetriever (cached RAG retrieval)
├── chains/
│   ├── legal-analysis.chain.ts           # LegalAnalysisChain
│   └── ai-diagnostics.chain.ts           # AIDiagnosticsChain
├── prompts/
│   ├── prompt-context-builder.ts         # formatUnifiedContextForPrompt, sanitizeUserNarrative
│   ├── legal-analysis.prompt.ts
│   ├── ai-diagnostics.prompt.ts
│   ├── fir-generation.prompt.ts
│   ├── chargesheet-generation.prompt.ts
│   ├── investigation-summary.prompt.ts
│   ├── case-diary-generation.prompt.ts
│   ├── remand-request-generation.prompt.ts
│   └── prompts.module.ts                 # PromptModule (all prompt builders as providers)
├── types/
│   ├── ai-diagnostics.types.ts           # Zod schemas + parseAIDiagnosticsResult
│   ├── legal-analysis.types.ts           # Zod schemas + parseLegalAnalysisResult
│   └── ai-shared.service.ts              # PromptExecutionHelper, AIObservabilityService, etc.
└── ingestion/
    ├── ipc.loader.ts                     # CSV loader (standalone script, not NestJS)
    ├── legal.splitter.ts                 # Text splitter (standalone script, not NestJS)
    └── ingest-laws.ts                    # Orchestrator script (standalone, not NestJS)
```

> **Note:** The ingestion pipeline (`ingest-laws.ts`) is a standalone script run manually, not a long-running service. It should remain as a plain script that imports NestJS providers via a bootstrap function, not a NestJS module.

---

## 2. Provider Migration (Singleton → Injectable)

### 2.1 `GeminiProvider` → `GeminiService`

**Current:** Manual singleton (`GeminiProvider.getInstance()`)
**Target:** `@Injectable()` with `OnModuleInit`

```
backend/src/ai/providers/gemini.provider.ts
```

| Aspect | Current (Next.js) | NestJS Target |
|---|---|---|
| Instantiation | `private constructor()` + `getInstance()` | `@Injectable()` — NestJS manages lifecycle |
| API Key | `process.env.GEMINI_API_KEY` (read in constructor) | `ConfigService.get('GEMINI_API_KEY')` |
| Model Name | `process.env.GEMINI_MODEL` | `ConfigService.get('GEMINI_MODEL', 'gemini-2.5-flash')` |
| Logger | `logger` (manual pino) | `private readonly logger = new Logger(GeminiService.name)` |
| Retry logic | Inline retry loop | Keep as-is (single retry at provider level) |
| Timeout | `withAITimeout` wrapper | Keep as-is |
| Error handling | `AIProviderError` custom class | Keep as-is |
| Export | `export const geminiProvider = GeminiProvider.getInstance()` | `export` the class; NestJS DI provides instances |

**Key changes:**
- Remove `private constructor()` and `getInstance()` static
- Add `constructor(private readonly config: ConfigService)` 
- Move `generateJSON()` to the injectable instance method
- Use NestJS `Logger` instead of manual pino import
- Keep `AIProviderError` as a standalone class (not injectable)

**Speed optimizations in GeminiService:**
- `onModuleInit()`: pre-initialize `GoogleGenerativeAI` client (avoid cold start on first request)
- Use `systemInstruction` param instead of prepending security text to every prompt (saves ~50 tokens/call)
- Add circuit breaker (5 failures → 30s cooldown → half-open)
- Add `countTokens()` method for observability
- Consider `generateContentStream()` for long documents (progressive output)

### 2.2 `FastAPIEmbeddingProvider` → `FastapiEmbeddingService`

**Current:** `getEmbeddingProvider()` factory + manual singleton
**Target:** `@Injectable()` in `EmbeddingModule`

```
backend/src/embedding/fastapi-embedding.service.ts
```

| Aspect | Current | NestJS Target |
|---|---|---|
| URL | `process.env.EMBEDDING_SERVICE_URL` (constructor) | `ConfigService.get('EMBEDDING_SERVICE_URL')` |
| Cache | `cacheService.get/set` (manual import) | Inject `CacheService` via constructor |
| Cache keys | `cacheKeys.queryEmbedding()` | Inject `CacheKeysService` |
| Validation | `validateEmbeddingOutput()` (module-level) | Private method on the service |
| Dimensions | `EXPECTED_DIMENSIONS = 384` (constant) | Keep as private constant |
| Fetch | `fetch()` + `AbortSignal.timeout(3000)` | Keep as-is |

**Key changes:**
- Constructor injection of `ConfigService`, `CacheService`, `CacheKeysService`
- Remove factory pattern (`getEmbeddingProvider()`)
- Implement `CrimeGPTEmbeddingProvider` interface (keep the interface as a shared contract)

### 2.3 `PGVectorStore` → `VectorStoreService`

**Current:** Manual singleton (`vectorStoreInstance`) + module-level functions
**Target:** `@Injectable()` with `OnModuleInit`

```
backend/src/ai/vector/pgvector.service.ts
```

| Aspect | Current | NestJS Target |
|---|---|---|
| Singleton | `let vectorStoreInstance: PGVectorStore \| null = null` | Private property, initialized in `onModuleInit` |
| Pool | `pool as sharedPool` from `lib/prisma` | Inject `PrismaService`, use raw pool access |
| Embeddings | `getEmbeddingProvider()` (factory) | Inject `FastapiEmbeddingService` |
| Functions | `createVectorStore()`, `similaritySearchDeduplicated()`, `getRetriever()` | Methods on the service |
| Custom retriever | `DeduplicatedVectorStoreRetriever` (extends `BaseRetriever`) | Keep as-is, but use injected embedding service |
| NoopEmbeddings | Placeholder for PGVector init | Keep as-is (PGVector needs an Embeddings instance) |

**Key changes:**
- Constructor injection of `PrismaService`, `FastapiEmbeddingService`
- `onModuleInit()`: ensure pgvector extension, initialize store
- `similaritySearchVectorWithScore()` → method on service
- `similaritySearchDeduplicated()` → method on service
- `getRetriever()` → method on service
- Remove `dotenv.config()` (NestJS loads env via `ConfigModule`)

**Speed optimizations in VectorStoreService:**
- Create dedicated `pg.Pool` (not Prisma's pool) with `max: 10` connections
- `onModuleInit()`: verify/create HNSW index for 5-50x faster similarity search
- Pool `idleTimeoutMillis: 30000` to reclaim idle connections
- `connectionTimeoutMillis: 5000` to fail fast on pool exhaustion

### 2.4 `LawRetriever` → `LawRetrieverService`

**Current:** Manual class with `retrieveLawsCached` function
**Target:** `@Injectable()` with cached retrieval

```
backend/src/ai/retrievers/law-retriever.service.ts
```

| Aspect | Current | NestJS Target |
|---|---|---|
| Cache | `cacheService.get/set` + `cacheKeys.lawRetrieval()` | Inject `CacheService`, `CacheKeysService` |
| Vector search | `similaritySearchDeduplicated()` (import) | Inject `VectorStoreService` |
| Logger | `logger` (manual pino) | NestJS `Logger` |
| Export | `export const lawRetriever = new LawRetriever()` | NestJS DI provides instance |

**Key changes:**
- Constructor injection of `CacheService`, `CacheKeysService`, `VectorStoreService`
- `retrieve()` method becomes the injected service method
- Keep `CleanedLawReference` interface (export from the service file or a shared types file)

**Speed optimizations in LawRetrieverService:**
- Parallel cache check + embedding: start Redis GET while preparing the query
- Cache TTL: 6 hours for law retrieval (already implemented)
- Cache key includes normalized query + topK to avoid cache collisions
- Don't cache empty results (prevents stale retries)

---

## 3. Prompt Module

### 3.1 Prompt Builders → `PromptService`

All prompt builder functions are pure functions (no side effects, no DB calls). Two approaches:

**Option A (Recommended): Keep as pure functions, expose via a PromptService**

```
backend/src/ai/prompts/prompts.service.ts
```

A thin `@Injectable()` wrapper that imports the pure builder functions:

```typescript
@Injectable()
export class PromptService {
  buildFIR(context: UnifiedCaseContext, laws: CleanedLawReference[]): string {
    return buildFIRGenerationPrompt(context, laws);
  }
  // ... etc
}
```

**Option B: Convert each to an injectable class**

More NestJS-idiomatic but adds unnecessary boilerplate for pure functions.

**Recommendation:** Option A — the prompt builders are pure and don't need DI. The `PromptService` acts as a facade for consumers that want DI.

**Speed note:** The `PROMPT_SECURITY_INSTRUCTIONS` string is currently prepended to every prompt in `DocumentGeneratorService`. Move it to Gemini's `systemInstruction` parameter instead — this saves ~50 tokens per call AND is more secure against prompt injection.

### 3.2 Prompt Context Builder

`formatUnifiedContextForPrompt()` and `sanitizeUserNarrative()` are pure utilities. Move them as-is:

```
backend/src/ai/prompts/prompt-context-builder.ts
```

No changes needed — they're already pure functions.

**Speed-critical change:** Add field truncation to `formatUnifiedContextForPrompt()` to reduce prompt token count:
```typescript
// Truncate fields to control prompt size
const truncate = (str: string | null | undefined, max: number): string => {
  if (!str) return 'Not Specified';
  return str.length > max ? str.substring(0, max) + '...[truncated]' : str;
};

// Apply to:
// - narrative: 3,000 chars max (was 10,000)
// - statement fields: 500 chars each
// - description fields: 300 chars each
// - investigationNotes: 500 chars
```

**Also:** Remove `"None recorded."` for empty arrays — output nothing instead (saves tokens).

### 3.3 AI Shared Service → Split into Providers

| Current Service | NestJS Target | Module |
|---|---|---|
| `DocumentVersionService` | Merge into `DocumentService` (already exists) | CaseModule |
| `AIObservabilityService` → `AiObservabilityService` | `@Injectable()` provider | AIModule |
| `GeneratedDocumentService` → keep as repository wrapper | Already handled by document repositories | CaseModule |
| `PromptExecutionHelper` → `PromptService` | Pure function wrapper (see 3.1) | AIModule |

---

## 4. Chain Migration

### 4.1 `LegalAnalysisChain` → `LegalAnalysisChainService`

**Current:** `new LegalAnalysisChain()` + `chain.execute(context, k)`
**Target:** `@Injectable()` with injected dependencies

```
backend/src/ai/chains/legal-analysis.chain.ts
```

**Dependencies to inject:**
- `LawRetrieverService` (for RAG retrieval)
- `GeminiService` (for LLM calls)
- `PromptService` (for prompt building)
- `Logger` (NestJS built-in)

**Method:** `execute(context: UnifiedCaseContext, k = 5): Promise<ChainOutput>`

### 4.2 `AIDiagnosticsChain` → `AIDiagnosticsChainService`

Same pattern as LegalAnalysisChain.

```
backend/src/ai/chains/ai-diagnostics.chain.ts
```

**Dependencies to inject:**
- `LawRetrieverService`
- `GeminiService`
- `PromptService`
- `Logger`

---

## 5. Type Validation

### Zod Schemas (No Migration Needed)

These are pure type definitions and Zod schemas — they don't need NestJS migration:

- `backend/src/ai/types/ai-diagnostics.types.ts` → keep as-is
- `backend/src/ai/types/legal-analysis.types.ts` → keep as-is

---

## 6. Module Wiring

### 6.1 `EmbeddingModule` (from empty skeleton)

```
backend/src/embedding/embedding.module.ts
```

```typescript
@Module({
  providers: [FastapiEmbeddingService],
  exports: [FastapiEmbeddingService],
})
export class EmbeddingModule {}
```

### 6.2 `VectorModule` (new)

```
backend/src/ai/vector/vector.module.ts
```

```typescript
@Module({
  imports: [PrismaModule, EmbeddingModule, CacheModule],
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorModule {}
```

### 6.3 `AIModule` (expand from empty skeleton)

```
backend/src/ai/ai.module.ts
```

```typescript
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    CacheModule,
    EmbeddingModule,
    VectorModule,
  ],
  providers: [
    GeminiService,
    LawRetrieverService,
    LegalAnalysisChainService,
    AIDiagnosticsChainService,
    AiObservabilityService,
    PromptService,
  ],
  exports: [
    GeminiService,
    LawRetrieverService,
    LegalAnalysisChainService,
    AIDiagnosticsChainService,
    AiObservabilityService,
    PromptService,
  ],
})
export class AIModule {}
```

### 6.4 Update `AppModule`

Add `AIModule` and `EmbeddingModule` to `AppModule` imports (already present as skeletons — just ensure they're wired correctly).

---

## 7. Domain Services That Consume AI

These services in `src/features/case/services/` call into the AI pipeline. They need to be updated to use DI instead of singleton imports.

### 7.1 `DocumentGeneratorService`

**Current imports to replace:**
```typescript
// OLD
import { lawRetriever } from "@/ai/retrievers/law.retriever";
import { geminiProvider } from "@/ai/providers/gemini-provider";
import { aiObservabilityService, generatedDocumentService } from "@/services/shared/ai-shared.service";

// NEW (constructor injection)
constructor(
  private readonly prisma: PrismaService,
  private readonly caseRepository: CaseRepository,
  private readonly gemini: GeminiService,
  private readonly lawRetriever: LawRetrieverService,
  private readonly aiObservability: AiObservabilityService,
  private readonly activityService: ActivityService,
  private readonly documentRepository: DocumentRepository,
  private readonly redis: RedisService,
  private readonly logger: Logger,
) {}
```

**Speed optimization in DocumentGeneratorService pipeline:**
```typescript
// Parallel: context build + cache check (saves 100-500ms on cache hits)
const [context, cachedLaws] = await Promise.all([
  unifiedContextService.buildUnifiedCaseContext(caseId, userId),
  config.requiresRAG ? this.checkLawCache(ragQuery) : Promise.resolve(null),
]);

// Use systemInstruction for security (saves ~50 tokens per Gemini call)
const promptText = config.buildPrompt(enrichedContext, retrievedChunks);
// Security instructions go to Gemini's systemInstruction, not prepended to prompt
```

### 7.2 `LegalAnalysisService`

**Current imports to replace:**
```typescript
// OLD
import { legalAnalysisChain } from "@/ai/chains/legal-analysis.chain";
import { generatedDocumentService, aiObservabilityService } from "@/services/shared/ai-shared.service";

// NEW (constructor injection)
constructor(
  private readonly prisma: PrismaService,
  private readonly caseRepository: CaseRepository,
  private readonly legalAnalysisChain: LegalAnalysisChainService,
  private readonly aiObservability: AiObservabilityService,
  private readonly documentRepository: DocumentRepository,
  private readonly activityService: ActivityService,
  private readonly redis: RedisService,
  private readonly logger: Logger,
) {}
```

### 7.3 `AIDiagnosticsService`

**Current imports to replace:**
```typescript
// OLD
import { aiDiagnosticsChain } from "@/ai/chains/ai-diagnostics.chain";
import { aiObservabilityService } from "@/services/shared/ai-shared.service";

// NEW (constructor injection)
constructor(
  private readonly prisma: PrismaService,
  private readonly caseRepository: CaseRepository,
  private readonly aiDiagnosticsChain: AIDiagnosticsChainService,
  private readonly aiObservability: AiObservabilityService,
  private readonly logger: Logger,
) {}
```

---

## 8. Ingestion Pipeline (Standalone Script)

The ingestion pipeline (`ingest-laws.ts`) is a one-shot script, not a long-running service. It should remain standalone but can bootstrap NestJS providers:

```
backend/src/ai/ingestion/ingest-laws.ts
```

**Approach:** Create a minimal NestJS bootstrap that provides the needed services:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { VectorStoreService } from '../vector/pgvector.service';
import { FastapiEmbeddingService } from '../../embedding/fastapi-embedding.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vectorStore = app.get(VectorStoreService);
  const embedding = app.get(FastapiEmbeddingService);
  // ... run ingestion logic using injected services
  await app.close();
}
```

The CSV loader (`ipc.loader.ts`) and text splitter (`legal.splitter.ts`) remain as-is — they're pure utilities with no DI needs.

---

## 9. Files to Create

| # | File Path | Purpose |
|---|---|---|
| 1 | `backend/src/ai/providers/gemini.provider.ts` | GeminiService (LLM provider) |
| 2 | `backend/src/ai/embeddings/embedding-provider.interface.ts` | CrimeGPTEmbeddingProvider interface |
| 3 | `backend/src/embedding/fastapi-embedding.service.ts` | FastAPI embedding HTTP client |
| 4 | `backend/src/embedding/embedding.module.ts` | **Update** existing skeleton |
| 5 | `backend/src/ai/vector/pgvector.service.ts` | VectorStoreService (PGVector) |
| 6 | `backend/src/ai/vector/vector.module.ts` | VectorModule |
| 7 | `backend/src/ai/retrievers/law-retriever.service.ts` | LawRetrieverService (cached RAG) |
| 8 | `backend/src/ai/chains/legal-analysis.chain.ts` | LegalAnalysisChainService |
| 9 | `backend/src/ai/chains/ai-diagnostics.chain.ts` | AIDiagnosticsChainService |
| 10 | `backend/src/ai/prompts/prompt-context-builder.ts` | Pure utilities (copy as-is) |
| 11 | `backend/src/ai/prompts/prompts.service.ts` | PromptService (facade) |
| 12 | `backend/src/ai/prompts/legal-analysis.prompt.ts` | Prompt builder (copy as-is) |
| 13 | `backend/src/ai/prompts/ai-diagnostics.prompt.ts` | Prompt builder (copy as-is) |
| 14 | `backend/src/ai/prompts/fir-generation.prompt.ts` | Prompt builder (copy as-is) |
| 15 | `backend/src/ai/prompts/chargesheet-generation.prompt.ts` | Prompt builder (copy as-is) |
| 16 | `backend/src/ai/prompts/investigation-summary.prompt.ts` | Prompt builder (copy as-is) |
| 17 | `backend/src/ai/prompts/case-diary-generation.prompt.ts` | Prompt builder (copy as-is) |
| 18 | `backend/src/ai/prompts/remand-request-generation.prompt.ts` | Prompt builder (copy as-is) |
| 19 | `backend/src/ai/types/ai-diagnostics.types.ts` | Zod schemas (copy as-is) |
| 20 | `backend/src/ai/types/legal-analysis.types.ts` | Zod schemas (copy as-is) |
| 21 | `backend/src/ai/types/ai-shared.types.ts` | Shared AI types (CleanedLawReference, etc.) |
| 22 | `backend/src/ai/services/ai-observability.service.ts` | AiObservabilityService |
| 23 | `backend/src/ai/ingestion/ipc.loader.ts` | CSV loader (copy as-is) |
| 24 | `backend/src/ai/ingestion/legal.splitter.ts` | Text splitter (copy as-is) |
| 25 | `backend/src/ai/ingestion/ingest-laws.ts` | Ingestion script (update to use NestJS bootstrap) |

## 10. Files to Modify

| # | File Path | Changes |
|---|---|---|
| 1 | `backend/src/ai/ai.module.ts` | Expand skeleton → full module with providers |
| 2 | `backend/src/app.module.ts` | Ensure AIModule + EmbeddingModule are properly imported |
| 3 | `backend/src/cache/cache-keys.service.ts` | Already has `queryEmbedding` and `lawRetrieval` — no changes needed |
| 4 | `backend/src/case/services/document-generator.service.ts` | **Phase 3** service — update AI imports to use DI |
| 5 | `backend/src/case/services/legal-analysis.service.ts` | **Phase 3** service — update AI imports to use DI |
| 6 | `backend/src/case/services/ai-diagnostics.service.ts` | **Phase 3** service — update AI imports to use DI |
| 7 | `backend/src/case/case.module.ts` | Import AIModule, VectorModule for services that need AI |
| 8 | `backend/package.json` | Add `@google/generative-ai`, `@langchain/core`, `@langchain/pgvector`, `csv-parser`, `zod` |

---

## 11. Dependency Graph

```
AppModule
├── ConfigModule (global)
├── PrismaModule (global)
├── RedisModule (global)
├── CacheModule (global)
├── EmbeddingModule
│   └── FastapiEmbeddingService ← CacheService, CacheKeysService, ConfigService
├── VectorModule
│   └── VectorStoreService ← PrismaService, FastapiEmbeddingService
├── AIModule
│   ├── GeminiService ← ConfigService
│   ├── LawRetrieverService ← CacheService, CacheKeysService, VectorStoreService
│   ├── LegalAnalysisChainService ← LawRetrieverService, GeminiService, PromptService
│   ├── AIDiagnosticsChainService ← LawRetrieverService, GeminiService, PromptService
│   ├── AiObservabilityService ← PrismaService (or DocumentRepository)
│   └── PromptService (facade for pure functions)
└── CaseModule
    ├── DocumentGeneratorService ← GeminiService, LawRetrieverService, AiObservabilityService, ...
    ├── LegalAnalysisService ← LegalAnalysisChainService, AiObservabilityService, ...
    └── AIDiagnosticsService ← AIDiagnosticsChainService, AiObservabilityService, ...
```

---

## 12. New Dependencies to Install

```bash
cd backend && npm install @google/generative-ai zod csv-parser
```

**Already in `backend/package.json` (from Phase 1 scaffolding):**
- `@nestjs/config` ✅
- `@nestjs/cache-manager` ✅
- `@langchain/core` — needs install
- `@langchain/pgvector` — needs install
- `@langchain/textsplitters` — needs install
- `pg` — needs install (for raw pool access in VectorStoreService)

```bash
cd backend && npm install @langchain/core @langchain/pgvector @langchain/textsplitters pg
```

> **Note:** `pg` is needed because `@langchain/pgvector` requires a `pg.Pool` instance. The `PrismaService` exposes `$queryRaw` but not the raw `pg.Pool`. We'll need to either:
> 1. Extract the pool from Prisma's internals (`(prisma as any)._engine.pool`) — fragile
> 2. Create a separate `pg.Pool` in `VectorStoreService` using `DATABASE_URL` — simpler and more explicit

**Recommendation:** Option 2 — create a dedicated `pg.Pool` in `VectorStoreService` for PGVector operations. This keeps the Prisma connection clean and avoids coupling to Prisma internals.

---

## 13. Environment Variables (No Changes)

All required env vars are already defined in `backend/.env.example`:

```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
EMBEDDING_SERVICE_URL=http://localhost:8000
EMBEDDING_PROVIDER=fastapi
DATABASE_URL=postgresql://...
REDIS_URL=...
```

---

## 14. Implementation Order

### Step 1: Foundation (Types + Interface)
1. Create `backend/src/ai/types/ai-shared.types.ts` — shared types (`CleanedLawReference`, `ChainOutput`, `DiagnosticsChainOutput`)
2. Create `backend/src/ai/embeddings/embedding-provider.interface.ts` — `CrimeGPTEmbeddingProvider` interface

### Step 2: Low-Level Providers
3. Create `backend/src/ai/providers/gemini.provider.ts` — `GeminiService`
4. Create `backend/src/embedding/fastapi-embedding.service.ts` — `FastapiEmbeddingService`
5. Update `backend/src/embedding/embedding.module.ts` — register `FastapiEmbeddingService`

### Step 3: Vector Store
6. Create `backend/src/ai/vector/pgvector.service.ts` — `VectorStoreService`
7. Create `backend/src/ai/vector/vector.module.ts` — `VectorModule`

### Step 4: Retriever
8. Create `backend/src/ai/retrievers/law-retriever.service.ts` — `LawRetrieverService`

### Step 5: Prompts + Chains
9. Copy prompt files as-is into `backend/src/ai/prompts/`
10. Create `backend/src/ai/prompts/prompts.service.ts` — `PromptService` facade
11. Create `backend/src/ai/chains/legal-analysis.chain.ts` — `LegalAnalysisChainService`
12. Create `backend/src/ai/chains/ai-diagnostics.chain.ts` — `AIDiagnosticsChainService`

### Step 6: Observability
13. Create `backend/src/ai/services/ai-observability.service.ts` — `AiObservabilityService`

### Step 7: Module Wiring
14. Update `backend/src/ai/ai.module.ts` — full module with all providers
15. Update `backend/src/app.module.ts` — ensure imports are correct
16. Update `backend/src/case/case.module.ts` — import `AIModule` for services

### Step 8: Domain Service Updates
17. Update `backend/src/case/services/document-generator.service.ts` — inject AI providers
18. Update `backend/src/case/services/legal-analysis.service.ts` — inject AI providers
19. Update `backend/src/case/services/ai-diagnostics.service.ts` — inject AI providers

### Step 9: Ingestion Pipeline
20. Copy `ipc.loader.ts` and `legal.splitter.ts` as-is
21. Update `ingest-laws.ts` to use NestJS bootstrap pattern

### Step 10: Install + Verify
22. Install missing npm dependencies
23. Run `npx tsc --noEmit` to verify type safety
24. Verify module graph compiles without circular dependencies

---

## 15. Latency Optimization — Speed-First Design

### Current Latency Profile (Estimated)

| Step | Operation | Latency | Bottleneck? |
|---|---|---|---|
| 1 | Redis lock acquisition | 1-5ms | No |
| 2 | Case fetch + context build (Prisma joins) | 50-200ms | No |
| 3 | Entity validation | <1ms | No |
| 4a | Embedding cache lookup (Redis) | 1-5ms (hit) | No |
| 4b | Embedding query via FastAPI (cache miss) | 100-500ms | No |
| 4c | PGVector similarity search | 50-200ms | No |
| 5 | Prompt building (string concat) | 1-5ms | No |
| 6 | **Gemini API call** | **2,000-10,000ms** | **YES** |
| 7 | JSON parse + Zod validation | 1-10ms | No |
| 8 | DB transaction (FOR UPDATE + writes) | 50-200ms | No |
| | **TOTAL (cache hit)** | **~2,100-10,200ms** | |
| | **TOTAL (cache miss)** | **~2,300-10,700ms** | |

**The Gemini call dominates at 90%+ of total latency.** Everything else is noise by comparison. Optimizations must focus on: (a) reducing Gemini call count, (b) reducing prompt token count, (c) reducing Gemini response time, (d) overlapping non-Gemini work.

---

### 15.1 Prompt Token Optimization (HIGH IMPACT)

The prompts are **massive** — `formatUnifiedContextForPrompt()` serializes the entire case context (victims, accused, witnesses, vehicles, seized items, medical, court, evidence, activities) into a single string. This directly impacts Gemini latency because:
- More input tokens = longer time-to-first-token
- More input tokens = higher cost per call
- Gemini has input token limits

**Optimizations:**

1. **Truncate long fields** in `formatUnifiedContextForPrompt()`:
   - `narrative`: cap at 3,000 chars (already capped at 10,000 via `sanitizeUserNarrative` — reduce to 3,000)
   - `statement` fields: cap at 500 chars each
   - `description` fields: cap at 300 chars each
   - `investigationNotes`: cap at 500 chars

2. **Skip empty sections** — the current code outputs `"None recorded."` for empty arrays, wasting tokens. Output nothing instead.

3. **Condensed context for non-primary documents** — For documents that don't need full context (Case Diary, Remand Request), use a condensed version that omits vehicles, seized items, medical, and court info.

4. **Measure prompt tokens** — Add a `countTokens()` method to `GeminiService` using `model.countTokens()`. Log token counts in observability. This lets you detect bloat.

**Estimated impact:** 20-40% reduction in input tokens → 15-30% faster Gemini response.

---

### 15.2 Gemini Call Optimization (HIGH IMPACT)

1. **Gemini Context Caching** — Google's Gemini API supports [context caching](https://ai.google.dev/gemini-api/docs/caching). If the same prompt prefix is repeated across generations for the same case (e.g., the case context + security instructions), cache it:
   ```typescript
   // In GeminiService
   async createCachedContext(promptPrefix: string): Promise<string> {
     const cache = await this.genAI.caches.create({
       model: this.modelName,
       contents: [{ role: 'user', parts: [{ text: promptPrefix }] }],
       ttl: '3600s',
     });
     return cache.name;
   }
   ```
   **When to use:** Regeneration of the same document type for the same case (same context, different random seed).

2. **Reduce retry delay** — Current retry uses `Math.min(1000 * 2^attempt + random, 30000)`. For 429 errors, the first retry waits 2-3s. Consider reducing to 500ms base for faster recovery.

3. **Streaming for progress** — Use `model.generateContentStream()` instead of `model.generateContent()` to get partial responses. This doesn't reduce total time but improves perceived speed for the user (first tokens arrive faster).

4. **Model selection per document type** — Use `gemini-2.5-flash` for simpler documents (Case Diary, Remand Request) and `gemini-2.5-pro` only for complex ones (Charge Sheet, Legal Analysis). Flash is 2-5x faster.

---

### 15.3 Parallelization (MEDIUM IMPACT)

**Current pipeline is fully sequential:**
```
Case Fetch → Context Build → [RAG: Embed + Search] → Prompt Build → Gemini → Validate → Save
```

**Optimized pipeline with parallelization:**
```
Case Fetch → Context Build ──┬── [RAG: Embed + Search] ──→ Prompt Build → Gemini → Validate → Save
                              └── [Entity Validation] (already instant, no change)
```

The key insight: **RAG retrieval and entity validation can run in parallel** (they're independent). But the bigger win is:

**Start embedding the RAG query while still building the prompt string.** The embedding call (FastAPI HTTP) takes 100-500ms. If we can overlap it with prompt string building (1-5ms), we save ~100-500ms.

Actually, the prompt needs the RAG results, so we can't overlap those. But we CAN:

1. **Pre-embed common query prefixes** — If the query always starts with `title + narrative`, cache the embedding of the narrative separately and combine vectors.

2. **Parallel case context + Redis cache check** — Start the Redis cache lookup for law retrieval simultaneously with the case context build. If cache hits, skip the embedding entirely.

```typescript
// Parallel: context build + cache check
const [context, cachedLaws] = await Promise.all([
  unifiedContextService.buildUnifiedCaseContext(caseId, userId),
  config.requiresRAG 
    ? cacheService.get<CleanedLawReference[]>(cacheKey)
    : Promise.resolve(null),
]);

// If cache miss, then do RAG
let retrievedChunks = cachedLaws ?? [];
if (!cachedLaws && config.requiresRAG) {
  retrievedChunks = await lawRetriever.retrieve(ragQuery, 6);
}
```

**Estimated impact:** 100-500ms saved per generation (embedding cache miss path).

---

### 15.4 Connection Pool Tuning (MEDIUM IMPACT)

**PGVector pool:** The plan creates a dedicated `pg.Pool`. Tune it:
```typescript
const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 10,              // Don't exceed 10 connections for vector search
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

**Prisma pool:** Already configured via `DATABASE_URL`. Verify `connection_limit` in the URL:
```
DATABASE_URL=postgresql://...?connection_limit=20
```

**Gemini client:** The `@google/generative-ai` SDK uses HTTP/2 by default. No pool tuning needed, but ensure `keepAlive` is enabled.

---

### 15.5 Zod Schema Optimization (LOW IMPACT, EASY WIN)

Zod `.parse()` recompiles the schema on every call. Pre-compile schemas:

```typescript
// In PromptService or chain services
import { z } from 'zod';

// Pre-compile at module init time
const compiledFIRSchema = FIRSchema.compile();
const compiledChargeSheetSchema = ChargeSheetSchema.compile();
// etc.

// Use .safeParse() for faster error handling
const result = compiledFIRSchema.safeParse(rawData);
if (!result.success) {
  // handle error
}
```

**Estimated impact:** 1-5ms saved per validation (minor, but free).

---

### 15.6 PGVector Index Verification (HIGH IMPACT for RAG speed)

The `ipc_chunks_embeddings` table MUST have a proper vector index. Without it, similarity search degrades to sequential scan:

```sql
-- HNSW index (recommended for <1M vectors, faster query time)
CREATE INDEX IF NOT EXISTS idx_ipc_chunks_embedding_hnsw 
  ON ipc_chunks_embeddings 
  USING hnww (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);

-- Or IVFFlat index (for >1M vectors)
CREATE INDEX IF NOT EXISTS idx_ipc_chunks_embedding_ivfflat 
  ON ipc_chunks_embeddings 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
```

**Add to `VectorStoreService.onModuleInit()`:**
```typescript
async onModuleInit() {
  // ... create pool, verify extension
  
  // Verify HNSW index exists (create if not)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ipc_chunks_embedding_hnwi 
    ON ipc_chunks_embeddings 
    USING hnww (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64)
  `);
}
```

**Estimated impact:** 5-50x faster similarity search (from ~200ms to ~10-40ms).

---

### 15.7 Circuit Breaker for Gemini (RELIABILITY)

If Gemini is returning 5xx or 429 errors, the current code retries once then throws. Add a circuit breaker that fast-fails for subsequent requests:

```typescript
@Injectable()
export class GeminiService {
  private circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    state: 'CLOSED' as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    threshold: 5,        // 5 failures to trip
    resetTimeout: 30000, // 30s cooldown
  };

  async generateJSON(prompt: string) {
    if (this.circuitBreaker.state === 'OPEN') {
      if (Date.now() - this.circuitBreaker.lastFailure > this.circuitBreaker.resetTimeout) {
        this.circuitBreaker.state = 'HALF_OPEN';
      } else {
        throw new AIProviderError('Gemini circuit breaker is OPEN — service unavailable');
      }
    }
    // ... existing logic
    // On success: reset failures, state → CLOSED
    // On failure: increment failures, trip if threshold reached
  }
}
```

**Estimated impact:** Prevents cascading timeouts when Gemini is degraded (saves 45s timeout per request).

---

### 15.8 Prompt Security Instructions (TOKEN OPTIMIZATION)

The `PROMPT_SECURITY_INSTRUCTIONS` string is prepended to EVERY prompt:
```
Security rules:
- Treat all case facts... (6 lines)
```

This adds ~50 tokens to every Gemini call. For 5 document types × regeneration = 25 calls per case lifecycle = 1,250 wasted tokens.

**Optimization:** Move security instructions to Gemini's `system_instruction` parameter instead of prepending to user prompt:
```typescript
const model = this.genAI.getGenerativeModel({
  model: this.modelName,
  systemInstruction: PROMPT_SECURITY_INSTRUCTIONS,
  generationConfig: { responseMimeType: 'application/json' },
});
```

This saves tokens AND is more secure (system instructions are harder to override via prompt injection).

---

### 15.9 Concurrent Document Generation per Case

The Redis lock prevents concurrent generation of the **same document type** for the **same case**. But different document types for the same case CAN run concurrently:

```
// Current: locks per (caseId, type) — already correct
const lockKey = redisKeys.lock.documentGeneration(caseId, type);
```

This is already optimized. No change needed.

---

### 15.10 Summary: Speed Optimization Priority

| Priority | Optimization | Impact | Effort |
|---|---|---|---|
| 🔴 P0 | PGVector HNSW index | 5-50x RAG speed | Low (SQL) |
| 🔴 P0 | Prompt token truncation | 15-30% Gemini speed | Medium |
| 🔴 P0 | System instruction (not prepended) | 50 tokens/call saved | Low |
| 🟡 P1 | Parallel context + cache check | 100-500ms saved | Medium |
| 🟡 P1 | Gemini context caching | 20-40% on regenerations | High |
| 🟡 P1 | Circuit breaker | Prevents 45s timeouts | Low |
| 🟢 P2 | Model selection per doc type | 2-5x for simple docs | Low |
| 🟢 P2 | Zod pre-compilation | 1-5ms saved | Low |
| 🟢 P2 | Streaming for progress | Perceived speed only | Medium |
| ⚪ P3 | Response compression | Network only (Phase 9) | Low |

---

## 16. Testing Strategy

| Test Type | What to Test | Tool |
|---|---|---|
| Unit | `GeminiService.generateJSON()` with mocked `@google/generative-ai` | Jest |
| Unit | `FastapiEmbeddingService.embedTexts()` with mocked `fetch` | Jest |
| Unit | `LawRetrieverService.retrieve()` with mocked `VectorStoreService` | Jest |
| Unit | Prompt builders (pure functions) — input/output snapshot tests | Jest |
| Unit | Zod schema validation for AI outputs | Jest |
| Integration | `VectorStoreService.similaritySearchDeduplicated()` against real PGVector | Jest + test DB |
| E2E | Full RAG pipeline: query → retrieve → prompt → generate → validate | Jest + supertest |

---

## 17. Migration Checklist

### Correctness
- [ ] All AI singletons converted to `@Injectable()` providers
- [ ] All `process.env` reads replaced with `ConfigService`
- [ ] All manual `logger` imports replaced with NestJS `Logger`
- [ ] All `cacheService`/`cacheKeys` imports replaced with DI
- [ ] `AIModule` properly exports all AI services
- [ ] `EmbeddingModule` properly exports `FastapiEmbeddingService`
- [ ] `VectorModule` properly exports `VectorStoreService`
- [ ] `CaseModule` imports `AIModule` for services that need AI
- [ ] `DocumentGeneratorService` uses DI for all AI dependencies
- [ ] `LegalAnalysisService` uses DI for all AI dependencies
- [ ] `AIDiagnosticsService` uses DI for all AI dependencies
- [ ] Ingestion pipeline works via NestJS bootstrap
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No circular dependency warnings in module graph
- [ ] All prompt builders work correctly with new context types

### Speed
- [ ] HNSW index created on `ipc_chunks_embeddings` table
- [ ] Prompt fields truncated (narrative: 3000, statements: 500, descriptions: 300)
- [ ] Empty arrays output nothing (not "None recorded.")
- [ ] `PROMPT_SECURITY_INSTRUCTIONS` moved to Gemini `systemInstruction`
- [ ] `VectorStoreService` uses dedicated `pg.Pool` with `max: 10`
- [ ] `GeminiService` has circuit breaker (5 failures → 30s cooldown)
- [ ] `GeminiService.onModuleInit()` pre-initializes client
- [ ] DocumentGeneratorService parallelizes context build + cache check
- [ ] Token count logged in observability for prompt bloat detection
- [ ] Zod schemas pre-compiled at module init

# CrimeGPT v2 — Complete LLM Project Context

> **Purpose**: This document gives an AI language model (or new developer) complete, authoritative context about the CrimeGPT v2 codebase — its purpose, architecture, data models, patterns, and conventions. Keep this file up-to-date as the project evolves.

---

## 1. Project Overview

**CrimeGPT v2** is a production-grade AI-powered criminal investigation management platform built for law enforcement professionals. Officers can:

- Create and manage criminal case files with rich structured data
- Automatically generate legally-sound documents (FIRs, Charge Sheets, Investigation Summaries, Legal Analysis, etc.) using Gemini 2.5 Flash via RAG over ingested Indian law (IPC/BNS)
- Query and manage persons (victims, accused, witnesses), evidence, vehicles, seized items, medical information, and court records
- Track case activity timelines, checklist items, and investigation notes
- Chat with an AI assistant about case details
- View AI observability logs (latency, token usage, retrieved law chunks) per request

**Target users**: Police officers and detectives (India jurisdiction, IPC/BNS law).

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 15.5** (App Router) |
| Language | **TypeScript 5** |
| Database | **PostgreSQL** (via Prisma 7.8) |
| ORM | **Prisma Client** (output: `src/generated/prisma`) |
| Vector Store | **PGVector** via `@langchain/pgvector` |
| AI Model | **Gemini 2.5 Flash** (`gemini-2.5-flash`) via `@google/generative-ai` |
| Embeddings | **all-MiniLM-L6-v2** (`@huggingface/transformers`) — 384-dimensional |
| LangChain | `@langchain/core`, `@langchain/google-genai`, `@langchain/pgvector`, `@langchain/textsplitters` |
| Auth | **NextAuth v5** (beta) with Prisma Adapter + OAuth |
| Validation | **Zod 4** |
| UI | **React 19**, **Tailwind CSS 4**, **shadcn/ui**, **Lucide React** |
| Forms | **React Hook Form** + `@hookform/resolvers` |
| PDF Export | **jsPDF** |
| Notifications | **sonner** |

---

## 3. Architecture

### 3.1 Core Invariant

```
Server Action (controller) → Service (orchestration) → Repository (database)
```

**Rules enforced by `src/scripts/audit-crimegpt.ts`:**

| Layer | Allowed | Forbidden |
|-------|---------|----------|
| **Server Actions** (`src/actions/`) | Call services. Validate input. Return `ActionResponse`. Call `auth()`. Call `revalidatePath()`. | Direct Prisma DB access. Raw Gemini calls. |
| **Services** (`src/services/`) | Call repositories. Call AI layer. Call other services. Contain business logic. | Direct Prisma access (except `document-generator.service.ts` which uses a transaction). |
| **Repositories** (`src/repositories/`) | Direct Prisma DB access only. | Any business logic. |
| **AI Layer** (`src/ai/`) | Provider calls, prompt building, retrieval, embeddings, parsing. | Business logic. Direct DB access. |

### 3.2 Directory Map

```
d:\crimegpt\
├── prisma/
│   ├── schema.prisma              # PostgreSQL + pgvector schema
│   └── prisma.config.ts
├── src/
│   ├── actions/                   # Server Actions (controllers)
│   │   ├── case.action.ts
│   │   ├── case-activity.action.ts
│   │   ├── case-metadata.action.ts
│   │   ├── checklist.action.ts
│   │   ├── document.action.ts
│   │   ├── document-generation.action.ts
│   │   ├── evidence.action.ts
│   │   ├── fir.action.ts
│   │   ├── investigation-profile.action.ts
│   │   ├── investigation-summary.action.ts
│   │   ├── legal-analysis.action.ts
│   │   └── person.action.ts
│   ├── ai/
│   │   ├── chains/                # RAG orchestration chains
│   │   │   ├── legal-analysis.chain.ts
│   │   │   └── ai-diagnostics.chain.ts
│   │   ├── embeddings/
│   │   │   ├── embedding-provider.ts   # Swappable interface (LangChain Embeddings base)
│   │   │   └── minilm.embeddings.ts    # Concrete: all-MiniLM-L6-v2
│   │   ├── ingestion/
│   │   │   └── ingest-laws.ts     # Script: CSV law ingestion into pgvector
│   │   ├── prompts/               # Prompt builders (one per document type)
│   │   │   ├── legal-analysis.prompt.ts
│   │   │   ├── fir-generation.prompt.ts
│   │   │   ├── investigation-summary.prompt.ts
│   │   │   ├── chargesheet-generation.prompt.ts
│   │   │   ├── ai-diagnostics.prompt.ts
│   │   │   ├── case-diary-generation.prompt.ts
│   │   │   ├── remand-request-generation.prompt.ts
│   │   │   └── prompt-context-builder.ts
│   │   ├── providers/
│   │   │   └── gemini-provider.ts  # Singleton; Gemini 2.5 Flash; retry + timeout
│   │   ├── retrievers/
│   │   │   └── law.retriever.ts    # Similarity retrieval from pgvector
│   │   ├── types/                  # Zod schemas + TypeScript types for AI outputs
│   │   └── vector/
│   │       └── pgvector.ts         # PGVectorStore singleton + DeduplicatedRetriever
│   ├── app/                        # Next.js App Router pages & API routes
│   │   ├── (dashboard)/            # Root dashboard (case list)
│   │   ├── case/
│   │   │   ├── [id]/               # Case detail page (single case)
│   │   │   ├── audit/              # AI audit/observability dashboard
│   │   │   ├── new/                # New case creation form
│   │   │   └── settings/           # User settings
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/ # NextAuth handler
│   │   │   └── health/             # Health check endpoint
│   │   ├── login/                  # Login page
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Landing/home page
│   ├── auth.ts                     # NextAuth v5 config (PrismaAdapter + OAuth)
│   ├── auth.config.ts              # Auth provider configuration
│   ├── components/                 # Shared UI components (case panels, dialogs, viewers)
│   ├── features/
│   │   ├── audit/                  # AI request log dashboard feature
│   │   └── case/                   # Case list + case card feature
│   ├── lib/
│   │   ├── action-response.ts      # ActionSuccess/ActionFailure types + helpers
│   │   ├── ai/
│   │   │   └── with-ai-timeout.ts  # AbortController 45s timeout wrapper
│   │   ├── pdf-export.ts           # Client-side PDF export helper
│   │   ├── prisma.ts               # Prisma client singleton + pg.Pool singleton
│   │   ├── utils.ts                # cn() class helper
│   │   └── validation/
│   │       └── action-guard.ts     # validateActionInput Zod wrapper
│   ├── repositories/               # Database access (Prisma only)
│   ├── schema/                     # Zod schemas (shared form/action validation)
│   ├── scripts/                    # Developer utilities (audit scanner, ingestion tests)
│   ├── services/
│   │   ├── activity/               # CaseActivity logging service
│   │   ├── case/                   # Case, legal analysis, unified context services
│   │   ├── case-metadata/          # CaseMetadata service
│   │   ├── checklist/              # Checklist item service
│   │   ├── document-engine/        # AI document generation pipeline + registry
│   │   ├── evidence/               # Evidence management service
│   │   ├── fir/                    # FIR generation service
│   │   ├── investigation-profile/  # InvestigationProfile service
│   │   ├── investigation-summary/  # Investigation summary service
│   │   ├── pdf/                    # PDF builder service
│   │   ├── person/                 # Person (victim/accused/witness) service
│   │   ├── search/                 # Hybrid search service
│   │   └── shared/                 # Shared AI observability + doc versioning services
│   └── types/                      # Global TypeScript type declarations
├── docs/
│   ├── audit/                      # Phase 0 audit reports
│   └── LLM_PROJECT_CONTEXT.md      # This file
└── package.json
```

---

## 4. Database Schema (Prisma)

### 4.1 Enums

```typescript
enum CaseStatus    { OPEN | UNDER_INVESTIGATION | CLOSED }
enum DocumentType  { FIR | INVESTIGATION_SUMMARY | CHARGE_SHEET | LEGAL_ANALYSIS | AI_DIAGNOSTICS | REMAND_REQUEST | CASE_DIARY }
enum AIRequestType { LEGAL_ANALYSIS | FIR_GENERATION | INVESTIGATION_SUMMARY | CHARGE_SHEET | CHAT | AI_DIAGNOSTICS_GENERATION | REMAND_REQUEST_GENERATION | CASE_DIARY_GENERATION }
enum MessageRole   { USER | ASSISTANT }
enum PersonRole    { VICTIM | SUSPECT | WITNESS | OFFICER }
enum EvidenceType  { DOCUMENT | IMAGE | VIDEO | AUDIO | SCREENSHOT | LOG_FILE | OTHER }
enum ActivityType  { CASE_CREATED | CASE_UPDATED | METADATA_CREATED | ... (44 total values) }
```

### 4.2 Core Models

```
User (id, name, email, image)
  └── Case[] (id, title, narrative, status, userId)
        ├── GeneratedDocument[] (type, title, content: Json, version)
        ├── ChatSession[]
        │     └── ChatMessage[] (role, content)
        ├── AIRequestLog[] (requestType, prompt, retrievedContext, response, latencyMs, modelUsed, tokenUsage)
        ├── CaseMetadata (incidentDate, location, victimName, suspectName, witnessInfo, evidenceSummary, officerNotes)
        ├── CaseActivity[] (activityType, description, metadata: Json)
        ├── Person[] (name, role, phone, address, statement, notes)
        │     ├── Victim (injuryDetails, status)
        │     ├── Accused (arrestStatus, bailDetails)
        │     └── Witness (statementDate, credibilityScore)
        ├── Evidence[] (title, description, type, notes, fileUrl)
        ├── ChecklistItem[] (title, completed, completedAt)
        ├── InvestigationProfile (firNumber, policeStation, investigatingOfficer, dateOfRegistration,
        │                         incidentDateTime, incidentLocation, incidentDescription, investigationNotes)
        ├── Vehicle[] (make, model, year, color, licensePlate, registrationState, ownerName, seizureStatus, notes)
        ├── SeizedItem[] (itemName, description, serialNumber, seizureLocation, seizureDate, officerInCharge, storageLocation, status)
        ├── MedicalInformation[] (hospitalName, doctorName, admissionDate, injuryType, medicalReportNo, treatmentDetails, severity)
        └── CourtInformation[] (courtName, judgeName, caseNumber, nextHearingDate, chargesheetFiledDate, currentStatus, judgementDetails)

LegalChunk (lawName, sectionCode, title, content) — pgvector table: ipc_chunks_embeddings
```

All cascade deletes are set: deleting a `Case` removes all related records. `User` deletion cascades to `Case`.

### 4.3 pgvector Table

The `ipc_chunks_embeddings` table is managed by LangChain's `PGVectorStore` (not Prisma) and contains ingested Indian Penal Code / BNS law sections:

| Column | Type |
|--------|------|
| id | uuid |
| content | text |
| metadata | jsonb |
| embedding | vector(384) |

Embeddings: **all-MiniLM-L6-v2** (384 dimensions, cosine distance strategy).

---

## 5. Key Patterns & Conventions

### 5.1 Server Action Pattern

Every mutation Server Action follows this exact pattern:

```typescript
"use server";
import { z } from "zod";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";

const MyInputSchema = z.object({ ... });

export async function myAction(arg1: string, arg2: string) {
  return validateActionInput(
    MyInputSchema,
    { arg1, arg2 },
    async (validated) => {
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      // call a service
      const result = await myService.doThing(validated.arg1, session.user.id);
      revalidatePath("/some/path");
      return actionSuccess({ data: result });
    }
  );
}
```

**Key rules:**
- Must call `validateActionInput` for all mutations
- Must authenticate with `auth()` inside the handler callback
- Must return `ActionResponse<T>` — never throw to the client
- Must NOT import from `@prisma/client` or call `prisma` directly (only type imports from `@/generated/prisma/client` are allowed)
- Must NOT make raw Gemini calls — call a service instead

### 5.2 `validateActionInput` Helper

**File**: `src/lib/validation/action-guard.ts`

```typescript
export async function validateActionInput<TOutput, TResult>(
  schema: { safeParse: (input: any) => { success: true; data: TOutput } | { success: false; error: any } },
  input: any,
  handler: (data: TOutput) => Promise<ActionResponse<TResult>>
): Promise<ActionResponse<TResult>>
```

- Uses duck-typed schema parameter to avoid TypeScript generic inference issues
- On schema validation failure → returns `actionFailure("VALIDATION_ERROR", ..., fieldErrors)`
- On `AITimeoutError` → returns `actionFailure("AI_TIMEOUT", ...)`
- On `AIProviderError` → returns `actionFailure("AI_PROVIDER_ERROR", ...)`
- On other errors → returns `actionFailure("INTERNAL_ERROR", ...)`
- Wraps the handler; the handler should never throw to the action level

### 5.3 `ActionResponse<T>` Types

**File**: `src/lib/action-response.ts`

```typescript
// Success with optional payload
type ActionSuccess<T> = { success: true } & (T extends void ? {} : T);

// Failure with code, message, and optional field errors
interface ActionFailure {
  success: false;
  message: string;
  error: { code: ErrorCode; message: string; fields?: Record<string, string[]> };
}

type ActionResponse<T = void> = ActionSuccess<T> | ActionFailure;

// Helpers:
actionSuccess()                   // → ActionSuccess<void>
actionSuccess({ data: result })   // → ActionSuccess<{ data: typeof result }>
actionFailure("UNAUTHORIZED", "Unauthorized")
actionFailure("VALIDATION_ERROR", "Validation failed", fieldErrors)
```

**Error codes**: `"VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR" | "AI_PROVIDER_ERROR" | "AI_TIMEOUT"`

### 5.4 AI Timeout

**File**: `src/lib/ai/with-ai-timeout.ts`

All Gemini API calls are wrapped with `withAITimeout(fn, 45000)`. Internally uses `AbortController`. Throws `AITimeoutError` on timeout, which is caught by `validateActionInput`.

### 5.5 Gemini Provider

**File**: `src/ai/providers/gemini-provider.ts`

- Singleton: `GeminiProvider.getInstance()` / `geminiProvider`
- Model: `gemini-2.5-flash`, JSON mode (`responseMimeType: "application/json"`)
- Retry: up to 3 attempts with exponential backoff
- Retries on: `AITimeoutError`, HTTP 429, HTTP 5xx
- Does NOT retry on: HTTP 400, 401, 403, bad API key
- Export: `AIProviderError`, `AITimeoutError` (re-exported from `with-ai-timeout.ts`)

### 5.6 RAG Pipeline (AI Document Generation)

The general flow for any AI document type:

```
Server Action
  └─ DocumentGeneratorService.generateDocument(caseId, userId, type)
        ├── CaseRepository.findById()
        ├── UnifiedContextService.buildUnifiedCaseContext()
        ├── DocumentRegistry.getConfig(type)           ← finds prompt builder
        ├── lawRetriever.retrieve(narrative, k)         ← pgvector similarity search
        ├── buildPrompt(context, lawChunks)             ← type-specific prompt builder
        ├── geminiProvider.generateJSON(prompt)         ← Gemini 2.5 Flash (JSON mode)
        ├── documentRepository.deleteManyByType()       ← clear old versions
        ├── documentRepository.create()                 ← persist new document
        ├── aiRequestLogRepository.create()             ← observability log
        └── activityService.logDocumentGenerated()      ← activity timeline
```

**Legal Analysis** has its own dedicated `LegalAnalysisChain` + `LegalAnalysisService` using the same pattern.

### 5.7 Unified Case Context

`UnifiedContextService.buildUnifiedCaseContext(caseId, userId)` returns `UnifiedCaseContext` — a fully hydrated object with all related entities (persons, victims, accused, witnesses, vehicles, seized items, medical infos, court infos, evidence, checklist, documents, activities). This is passed to all prompt builders.

### 5.8 Document Registry Pattern

`DocumentRegistry` maps `DocumentType` → `{ promptBuilder, aiRequestType, title, activityType }`. Adding a new document type only requires registering it in the registry and creating its prompt builder — `DocumentGeneratorService` handles all other plumbing generically.

### 5.9 Repository Pattern

Each repository:
- Uses `prisma` singleton from `@/lib/prisma`
- Always scopes queries by `userId` for ownership (multi-tenant)
- Contains ONLY database queries (no business logic)
- Exports a singleton instance

Example:
```typescript
export class CaseRepository {
  async findById(id: string, userId: string) {
    return prisma.case.findFirst({ where: { id, userId }, include: { ... } });
  }
}
export const caseRepository = new CaseRepository();
```

### 5.10 Service Pattern

Each service:
- Instantiates repositories internally (no DI container)
- Contains business orchestration (validation, coordination, activity logging)
- Exports a singleton instance
- Does NOT access Prisma directly (delegates to repositories)

### 5.11 Authentication

NextAuth v5 with Google OAuth and Prisma Adapter. Session-based. `auth()` from `@/auth` is called inside server actions / server components to get the current user. The session includes `user.id`.

AUTH_URL sanitization logic in `src/auth.ts` handles missing protocol prefix.

---

## 6. AI Layer Detail

### Embeddings

- Provider interface: `EmbeddingProvider` (extends LangChain `Embeddings`)
- Concrete implementation: `MiniLMEmbeddings` using `@huggingface/transformers` with `all-MiniLM-L6-v2`
- Dimensions: **384**
- Used for: ingestion of law sections, similarity retrieval at query time

### Vector Store

- Table: `ipc_chunks_embeddings` (pgvector, cosine distance)
- Managed by LangChain `PGVectorStore`
- Custom retriever: `DeduplicatedVectorStoreRetriever` — fetches `k*2` candidates, deduplicates by page content, returns top `k` unique docs
- Minimum similarity threshold on raw retrieval: `0.35` (cosine similarity = 1 - cosine distance)

### Prompts

Every prompt builder function signature:
```typescript
buildXxxPrompt(context: UnifiedCaseContext, laws: CleanedLawReference[]): string
```

Prompts:
- Strictly instruct the model to output valid JSON conforming to the Zod schema
- Include the full unified case context
- Include retrieved law references with section, offense, punishment, and description
- If no laws are retrieved, the model is instructed to mark confidence as LOW and not cite sections

### Prompt Types / Document Types

| DocumentType | AIRequestType | Generator |
|---|---|---|
| `LEGAL_ANALYSIS` | `LEGAL_ANALYSIS` | `LegalAnalysisChain` + `LegalAnalysisService` |
| `FIR` | `FIR_GENERATION` | `DocumentGeneratorService` via registry |
| `INVESTIGATION_SUMMARY` | `INVESTIGATION_SUMMARY` | `DocumentGeneratorService` via registry |
| `CHARGE_SHEET` | `CHARGE_SHEET` | `DocumentGeneratorService` via registry |
| `AI_DIAGNOSTICS` | `AI_DIAGNOSTICS_GENERATION` | `DocumentGeneratorService` via registry |
| `REMAND_REQUEST` | `REMAND_REQUEST_GENERATION` | `DocumentGeneratorService` via registry |
| `CASE_DIARY` | `CASE_DIARY_GENERATION` | `DocumentGeneratorService` via registry |

**Business validation** (enforced before generation):
- `CHARGE_SHEET` requires at least one accused (`SUSPECT` role person OR `Accused` record)
- `FIR` requires at least one victim (`VICTIM` role person OR `Victim` record)

---

## 7. Observability

Every AI generation stores a record in `AIRequestLog`:
- `requestType` — which document type
- `prompt` — exact prompt sent to the model
- `retrievedContext` — JSON string of retrieved law chunks
- `response` — raw model response
- `latencyMs` — end-to-end chain latency
- `modelUsed` — model name string (e.g. `"gemini-2.5-flash"`)
- `tokenUsage` — total token count (from Gemini usage metadata)
- `caseId` — associated case

The `/case/audit` route renders an AI observability dashboard for all logs.

---

## 8. Activity Log

Every user and AI action logs to `CaseActivity`:
- `activityType` — `ActivityType` enum value
- `description` — human-readable description
- `metadata` — optional JSON with extra details (e.g. doc title, version, person name)

Activity service: `src/services/activity/activity.service.ts` — provides typed methods like `logDocumentGenerated`, `logPersonAdded`, `logEvidenceDeleted`, etc.

---

## 9. PDF Export

`src/lib/pdf-export.ts` — client-side PDF generation using jsPDF. Takes a `GeneratedDocument` and renders its structured JSON content as a formatted PDF.

`src/services/pdf/pdf-builder.ts` + `pdf-export.service.ts` — server-side PDF builder.

---

## 10. Important Dev Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Dev server | `npm run dev` | Start Next.js dev server |
| Build | `npm run build` | `prisma generate && next build` |
| Lint | `npm run lint` | ESLint check |
| Phase 0 audit | `npm run audit:phase0` | `tsx src/scripts/audit-crimegpt.ts` |
| Ingest laws | `npm run ingest:laws` | Ingest CSV law data into pgvector |
| Test retrieval | `npm run test-retrieval` | Test similarity retrieval from pgvector |

---

## 11. Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `AUTH_SECRET` | NextAuth secret (v5) |
| `AUTH_URL` | OAuth callback base URL (auto-sanitized by auth.ts) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |

---

## 12. Phase 0 Audit Rules (Static Architecture Enforcer)

`src/scripts/audit-crimegpt.ts` scans the codebase and reports violations:

**Critical checks:**
- Server actions must NOT directly import or use `prisma` (except type-only imports from `@/generated/prisma/client`)
- Services must NOT directly import `prisma` (exception: `document-generator.service.ts` uses it inside a transaction)
- Gemini SDK must NOT be imported outside `src/ai/providers/`
- Actions should call `validateActionInput`
- Catch blocks should not be completely empty (must have a comment or return)

**Known exclusions** (not scanned):
- `src/scripts/*` — developer utilities
- `src/app/api/health/route.ts` — health check

**Phase 0 status (as of v2 baseline):** ✅ 0 Critical findings.

---

## 13. Conventions & Style

- **Singletons**: Services and repositories are exported as singleton instances (`export const xService = new XService()`)
- **No DI container**: Dependencies are instantiated at module scope
- **TypeScript strict**: `strict: true` assumed throughout
- **No `any` abuse**: Zod schemas are used at action boundaries; types are inferred from schemas
- **Prefix `_` for unused args**: e.g. `catch (_err)` to satisfy ESLint `no-unused-vars`
- **No `console.log` in production paths**: AI provider and service logs use `console.log` with emoji prefixes (to be replaced by structured logging in Phase 11)
- **`revalidatePath`**: Always called after mutation server actions
- **File naming**: `*.action.ts`, `*.service.ts`, `*.repository.ts`, `*.chain.ts`, `*.prompt.ts`, `*.retriever.ts`

---

## 14. Outstanding Technical Debt (Deferred Phases)

| Item | Phase |
|------|-------|
| Structured logging (Pino or similar) | Phase 11 |
| Redis + BullMQ background workers for long AI jobs | Phase 1 |
| Streaming AI responses | Phase 1 |
| Docker / CI-CD pipeline | Phase 1 |
| Prisma schema redesign (Phase 1 data model) | Phase 1 |
| Remove remaining ESLint warnings (unused imports, img tags) | Phase 11 |
| Replace `console.log` in service layer with structured logger | Phase 11 |
| Add retry/dead-letter queue for AI failures | Phase 1 |

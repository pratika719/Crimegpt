# RAG & Embeddings Service — Analysis & Implementation Plan

## Executive Summary

The RAG pipeline retrieves IPC sections from PGVector to provide legal context for AI-generated documents (FIR, Legal Analysis, Charge Sheet, etc.). After a full audit of the retrieval, embedding, ingestion, and chain layers, **16 bugs/issues were identified**, including **2 critical architectural flaws** that are the most likely root cause of IPC section retrieval failures.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      INGESTION PATH                              │
│                                                                  │
│  ipc_sections.csv ──► ipc.loader.ts ──► legal.splitter.ts       │
│       (2891 rows)         (Document[])      (chunkSize=1000)     │
│                                                 │                │
│                                        embed via FastAPI         │
│                                   (all-MiniLM-L6-v2, 384d)      │
│                                                 │                │
│                                          PGVectorStore           │
│                                  table: ipc_chunks_embeddings    │
│                                  (shared with EVIDENCE chunks)   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       RETRIEVAL PATH                             │
│                                                                  │
│  case.narrative ──► LawRetriever.retrieve()                     │
│       │                    │                                     │
│       │         retrieveLawsCached() ──► Redis (6h TTL)         │
│       │                    │                                     │
│       │    similaritySearchDeduplicated()                        │
│       │         │                                                │
│       │    FastAPI embedTexts() ◄── query embedding             │
│       │         │                                                │
│       │    store.similaritySearchVectorWithScore()               │
│       │         │         ▲                                      │
│       │         │    NO sourceType filter! ◄── BUG               │
│       │         │         │                                      │
│       │    Dedup by pageContent                                  │
│       │         │                                                │
│       │    filter by minSimilarity=0.35                          │
│       │         │                                                │
│       ▼         ▼                                                │
│  CleanedLawReference[] ──► LegalAnalysisChain / DiagnosticsChain │
│                                  │                               │
│                            Gemini Flash                          │
│                             (JSON output)                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   EVIDENCE INGESTION PATH                        │
│                                                                  │
│  Evidence Upload ──► ingestion.processor.ts                     │
│                         │                                        │
│               evidence-ingestion.service.ts                      │
│                         │                                        │
│               evidence-chunking.service.ts                       │
│                         │                                        │
│               queueProducerService.addEmbeddingJob()             │
│                         │                                        │
│               embedding.processor.ts                             │
│                         │                                        │
│               evidence-embedding.service.ts                      │
│                         │                                        │
│                  PGVectorStore.addVectors()                      │
│           table: ipc_chunks_embeddings  ◄── SAME TABLE! ◄── BUG │
└──────────────────────────────────────────────────────────────────┘
```

---

## Critical Bugs Identified

### BUG 1: Evidence Vectors Contaminate Law Retrieval (CRITICAL)

**Location:** `src/features/case/services/evidence-embedding.service.ts` (insert) + `src/ai/vector/pgvector.ts` (query)

**Problem:** Both IPC law chunks and evidence chunks are stored in the **same** `ipc_chunks_embeddings` table. The `similaritySearchDeduplicated()` function performs a blanket similarity search with **no filtering by source type**.

**Impact:**
- When a user searches for IPC sections, evidence text from Case A can appear as a "legal reference" for Case B
- The Gemini prompt receives random case evidence injected as `[LAW REFERENCE N]`, causing hallucinated or irrelevant legal analysis
- Evidence metadata fields (caseId, evidenceId) appear in law retrieval results instead of section/offense/punishment
- The `LawRetriever` maps `doc.metadata.section` which is `"N/A"` for evidence chunks

**Evidence of the bug:**
```typescript
// evidence-embedding.service.ts line 35-40 — inserts with sourceType: "EVIDENCE"
metadata: {
  sourceType: "EVIDENCE",
  evidenceId: input.evidenceId,
  caseId: input.caseId,
  chunkIndex: input.chunkIndex,
  ...
}

// pgvector.ts similaritySearchDeduplicated — NO WHERE clause filters sourceType
const results = await store.similaritySearchVectorWithScore(queryVector, k * 2);
```

**Severity:** This is the most likely root cause of IPC sections not being retrieved properly.

---

### BUG 2: Missing Vector Index on Embedding Column (CRITICAL)

**Location:** `src/ai/vector/pgvector.ts` + Prisma migrations

**Problem:** There is no HNSW or IVFFlat index on the `embedding` column of `ipc_chunks_embeddings`. The `pgvector.ts` code does `CREATE EXTENSION IF NOT EXISTS vector` but never creates an index. `PGVectorStore.initialize()` from LangChain may auto-create the table but does **not** create a vector index.

**Impact:**
- Every similarity search performs a **sequential scan** over all vectors
- With ~2891 IPC sections (potentially more after splitting into 1000-char chunks) plus evidence vectors, each query scans every row
- On Neon PostgreSQL (serverless), this causes cold-start latency spikes and connection timeout errors
- The 3-second embedding timeout + sequential vector scan often exceeds total budget

---

### BUG 3: Embedding Service Timeout Too Short (HIGH)

**Location:** `src/ai/embeddings/fastapi-embedding.provider.ts` line 54

**Problem:** `AbortSignal.timeout(3000)` — only 3 seconds for the FastAPI embedding call.

**Impact:**
- During ingestion, batches of 50 texts are sent. The FastAPI service needs time to tokenize, encode, and return512-dimensional vectors
- The FastAPI service may have cold-start latency (model loading on first request)
- Health checks pass (simple /health endpoint), but actual /embed calls timeout
- This causes the entire RAG pipeline to fail with a generic fetch error

---

### BUG 4: No Retry Logic in Embedding Provider (HIGH)

**Location:** `src/ai/embeddings/fastapi-embedding.provider.ts`

**Problem:** `requestEmbeddings()` has zero retry logic. A single transient failure (network blip, FastAPI cold start, connection reset) kills the entire RAG pipeline.

**Contrast:** The Gemini provider (`gemini-provider.ts`) has retry logic with exponential backoff, but the embedding provider — called on every RAG query — has none.

---

### BUG 5: PGVectorStore Singleton Initialized with NoopEmbeddings (MEDIUM)

**Location:** `src/ai/vector/pgvector.ts` lines 14-22, 65

**Problem:** The vector store is initialized with `NoopEmbeddings` that throws on any call. This means:
- Any code path that uses `store.similaritySearch(stringQuery)` (the string-based API) will crash
- Only `similaritySearchVectorWithScore(vector, k)` works because vectors are pre-computed
- If LangChain internals change or new code paths are added, they'll hit the NoopEmbeddings trap

---

### BUG 6: Cache Key Hashes Lowercase but Embedding Input Preserves Case (LOW)

**Location:** `src/ai/embeddings/fastapi-embedding.provider.ts` line 16 vs line 27

**Problem:**
- Cache key: `text.trim().toLowerCase()` 
- Actual embedding input: `texts.map((text) => text.trim()).filter(Boolean)` — no toLowerCase

This means "Theft" and "theft" hit the same cache key, but produce different embeddings if the model is case-sensitive. With `all-MiniLM-L6-v2` this is benign in practice, but it's inconsistent.

---

### BUG 7: No Vector Dimension Validation at Query Time (MEDIUM)

**Location:** `src/ai/vector/pgvector.ts`

**Problem:** If the FastAPI service returns vectors with wrong dimensions (e.g., wrong model deployed), the pgvector query will fail with a cryptic PostgreSQL error like `different vector dimensions` instead of a clear application-level error.

---

### BUG 8: Ingestion Pipeline `store.end()` May Close Shared Pool (MEDIUM)

**Location:** `src/ai/ingestion/ingest-laws.ts` line 66

**Problem:** `await store.end()` is called after ingestion. The PGVector store uses the shared pool from `lib/prisma.ts`. Depending on the LangChain PGVector implementation, `end()` might close internal connections. Since this is a one-shot script it's usually fine, but if imported as a module in a server process, it could close connections needed by other consumers.

---

### BUG 9: LawRetriever Extracts `pageContent` via Regex That Misses Most Formats (MEDIUM)

**Location:** `src/ai/retrievers/law.retriever.ts` lines 69-75

**Problem:** The description extraction regex `pageContent.match(/Description:\r?\n([\s\S]*)$/i)` expects the literal string `Description:` followed by a newline. If the IPC loader format changes, or if evidence chunks (which don't have `Description:` headers) are returned, the entire `pageContent` is used as `description`. This causes the prompt to receive raw chunk text labeled as "description."

---

### BUG 10: `minSimilarity = 0.35` May Filter Valid Results (MEDIUM)

**Location:** `src/ai/vector/pgvector.ts` line 160

**Problem:** `minSimilarity = 0.35` means cosine distance > 0.65 is discarded. For `all-MiniLM-L6-v2`:
- Similar legal concepts (e.g., "theft" vs "robbery") may have distance 0.5-0.7
- This threshold could filter out valid related sections
- Combined with BUG 1 (evidence contamination), irrelevant evidence with high similarity scores (distance < 0.65) will pass through

---

### BUG 11: Warmup Doesn't Test Embedding Functionality (LOW)

**Location:** `src/app/api/warmup/route.ts`, `src/lib/warmup.ts`

**Problem:** The warmup endpoint pings `/health` on the FastAPI service, but health endpoints typically don't test the actual embedding model. A service can report "healthy" while the embedding model fails to load.

---

### BUG 12: No connection pool validation before vector operations (LOW)

**Location:** `src/ai/vector/pgvector.ts`

**Problem:** `createVectorStoreForStorage()` assumes the shared pool is healthy. If the pool has been idle and connections have been terminated by Neon's connection server, the first query will fail. There's no connection validation or retry.

---

### BUG 13: Legal splitter chunkSize=1000 may split mid-section (LOW)

**Location:** `src/ai/ingestion/splitters/legal.splitter.ts`

**Problem:** `chunkSize: 1000` with `chunkOverlap: 200` can split an IPC section's text mid-sentence, breaking semantic coherence. Legal sections have specific structure (offense + punishment + description) that should be kept together when possible.

---

### BUG 14: `dotenv.config()` in pgvector.ts conflicts with Next.js env handling (LOW)

**Location:** `src/ai/vector/pgvector.ts` line 8

**Problem:** `dotenv.config()` is called at module load. In Next.js, environment variables are injected via `next.config.js` or `.env.local`. Calling `dotenv.config()` may load stale or incorrect values, or interfere with Next.js's env handling.

---

### BUG 15: No observability for embedding latency (LOW)

**Location:** `src/ai/embeddings/fastapi-embedding.provider.ts`

**Problem:** The embedding provider doesn't log latency, success rate, or batch sizes. This makes it impossible to diagnose slow RAG queries or embedding service degradation.

---

### BUG 16: `validateEmbeddingOutput` validates all vectors for every call (LOW)

**Location:** `src/ai/embeddings/fastapi-embedding.provider.ts` lines 10-30

**Problem:** For batch embeddings (50+ texts), `validateEmbeddingOutput` iterates every vector checking every value. This is O(n × d) per call. For ingestion of ~2891 sections in batches of 50, this adds unnecessary overhead. The validation should be a sampling check or only on the first/last vector.

---

## Implementation Plan

### Phase 1: Fix Critical Architecture (Must-Do)

#### Step 1.1: Separate IPC and Evidence Vectors

**Files to modify:**
- `src/ai/vector/pgvector.ts`
- `src/ai/retrievers/law.retriever.ts`
- `src/features/case/services/evidence-embedding.service.ts`
- `src/ai/ingestion/ingest-laws.ts`

**Approach:** Add `sourceType` filtering to the similarity search, and create a separate IPC-only retrieval function.

```typescript
// pgvector.ts — new function
export async function similaritySearchIPC(
  query: string,
  k = 3,
  minSimilarity = 0.35
): Promise<[Document, number][]> {
  const store = await createVectorStoreForStorage();
  const embeddingProvider = getEmbeddingProvider();
  const embeddingResult = await embeddingProvider.embedTexts({ texts: [query] });
  const queryVector = embeddingResult.embeddings[0];

  // Raw SQL to filter only IPC law chunks (no sourceType or sourceType='LAW_CHUNK')
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, content, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM ipc_chunks_embeddings
     WHERE (metadata->>'sourceType' IS NULL OR metadata->>'sourceType' = 'LAW_CHUNK')
       AND (1 - (embedding <=> $1::vector)) >= $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [JSON.stringify(queryVector), minSimilarity, k * 2]
  );

  // Deduplicate by content
  const seen = new Set<string>();
  const uniqueResults: [Document, number][] = [];
  for (const row of result.rows) {
    const normalized = row.content.replace(/\s+/g, " ").trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueResults.push([
        new Document({ pageContent: row.content, metadata: row.metadata }),
        1 - row.similarity, // convert back to distance for compatibility
      ]);
    }
    if (uniqueResults.length >= k) break;
  }
  return uniqueResults;
}
```

Update `LawRetriever` to use `similaritySearchIPC` instead of `similaritySearchDeduplicated`.

#### Step 1.2: Add HNSW Vector Index

**Files to modify:**
- Create new Prisma migration

**SQL:**
```sql
CREATE INDEX IF NOT EXISTS ipc_chunks_embedding_hnsw_idx
ON ipc_chunks_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Note:** HNSW is preferred over IVFFlat for this use case because:
- IVFFlat requires the index to be rebuilt after data changes
- HNSW supports incremental inserts without rebuild
- The IPC corpus is relatively small (~3000 chunks) but will grow with evidence vectors

#### Step 1.3: Add `sourceType` Column Index

```sql
CREATE INDEX IF NOT EXISTS ipc_chunks_source_type_idx
ON ipc_chunks_embeddings ((metadata->>'sourceType'));
```

---

### Phase 2: Fix Embedding Provider (High Priority)

#### Step 2.1: Increase Timeout and Add Retry Logic

**File:** `src/ai/embeddings/fastapi-embedding.provider.ts`

```typescript
// Increase timeout from 3s to 30s
// Add retry with exponential backoff (3 attempts)
private async requestEmbeddings(texts: string[]): Promise<EmbeddingOutput> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${this.serviceUrl}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
        signal: AbortSignal.timeout(30_000), // 30s timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FastAPI embedding request failed: ${response.status} ${errorText}`);
      }

      const output = (await response.json()) as EmbeddingOutput;
      validateEmbeddingOutput(output, texts.length);
      return output;
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10_000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  logger.error(
    { err: lastError, textsCount: texts.length },
    "FastAPI embedding request failed after retries"
  );
  throw lastError;
}
```

#### Step 2.2: Cache Multi-Text Batches

Currently only single-text results are cached. Add batch caching for common batch sizes during ingestion.

#### Step 2.3: Add Latency Logging

```typescript
const startMs = Date.now();
// ... fetch call ...
const latencyMs = Date.now() - startMs;
logger.info({ latencyMs, textsCount: texts.length }, "Embedding request completed");
```

---

### Phase 3: Harden Retrieval Pipeline (Medium Priority)

#### Step 3.1: Add Vector Dimension Validation

**File:** `src/ai/vector/pgvector.ts`

```typescript
function validateQueryVector(vector: number[]): void {
  if (!Array.isArray(vector) || vector.length !== 384) {
    throw new Error(
      `Query vector has invalid dimensions. Expected 384, received ${vector?.length ?? 'undefined'}.`
    );
  }
  for (const v of vector) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error("Query vector contains non-finite values.");
    }
  }
}
```

#### Step 3.2: Add Connection Health Check Before Vector Operations

```typescript
export async function ensurePoolHealthy(): Promise<void> {
  const client = await sharedPool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}
```

#### Step 3.3: Fix LawRetriever Description Extraction

Make the regex more robust to handle both structured and unstructured content:

```typescript
// More robust description extraction
let description = "";
const descMatch = pageContent.match(
  /Description:\s*\r?\n([\s\S]*?)(?:\n\s*\n|$)/i
);
if (descMatch?.[1]) {
  description = descMatch[1].trim();
} else {
  // Fallback: use everything after "Punishment:" if present, else full content
  const punishmentMatch = pageContent.match(
    /Punishment:\s*\r?\n[\s\S]*?\n\s*\n([\s\S]*)/i
  );
  description = punishmentMatch?.[1]?.trim() || pageContent;
}
```

#### Step 3.4: Tune minSimilarity Threshold

Consider raising `minSimilarity` from 0.35 to 0.45 to reduce false positives, especially after fixing the evidence contamination issue. The threshold should be calibrated with test queries:

```typescript
// Configurable via environment variable
const MIN_SIMILARITY = parseFloat(process.env.RAG_MIN_SIMILARITY ?? "0.45");
```

---

### Phase 4: Improve Ingestion Pipeline (Medium Priority)

#### Step 4.1: Fix dotenv.config() in pgvector.ts

Remove `dotenv.config()` from `pgvector.ts`. The ingestion script (`ingest-laws.ts`) is a standalone script that should call `dotenv.config()` itself. The server-side code should rely on Next.js env handling.

#### Step 4.2: Improve Legal Splitting

Consider a legal-aware splitter that respects section boundaries:

```typescript
// Instead of fixed chunkSize, split by section boundaries first
// Then fall back to RecursiveCharacterTextSplitter for oversized sections
```

#### Step 4.3: Add Ingestion Idempotency

The ingestion script should check if data already exists before re-ingesting to avoid duplicates:

```typescript
const existingCount = await pool.query(
  "SELECT COUNT(*) FROM ipc_chunks_embeddings WHERE metadata->>'source' = 'IPC'"
);
if (parseInt(existingCount.rows[0].count) > 0) {
  console.log("IPC data already exists. Use --force to re-ingest.");
  return;
}
```

#### Step 4.4: Remove `store.end()` in ingestion

Since the pool is shared, don't call `store.end()`. Instead, let the pool be cleaned up naturally by the process exit.

---

### Phase 5: Add Observability & Diagnostics (Low Priority)

#### Step 5.1: Add RAG Health Check

**File:** `src/lib/health/health.service.ts`

Add a `checkRAGPipeline()` that:
1. Counts IPC vectors in the table
2. Verifies vector dimensions match expected 384
3. Runs a test embedding + search
4. Checks for evidence contamination

```typescript
async checkRAGPipeline(): Promise<HealthCheckResult> {
  try {
    const pool = getPool();
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM ipc_chunks_embeddings"
    );
    const dimResult = await pool.query(
      `SELECT array_length(embedding::real[], 1) as dims
       FROM ipc_chunks_embeddings LIMIT 1`
    );
    const sourceTypes = await pool.query(
      `SELECT metadata->>'sourceType' as type, COUNT(*) as count
       FROM ipc_chunks_embeddings
       GROUP BY metadata->>'sourceType'`
    );
    
    return {
      status: "ok",
      message: "RAG pipeline health check passed",
      metadata: {
        totalVectors: parseInt(countResult.rows[0].count),
        dimensions: dimResult.rows[0]?.dims,
        sourceTypes: sourceTypes.rows,
      },
    };
  } catch (error) {
    return {
      status: "failed",
      message: `RAG pipeline check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
```

#### Step 5.2: Add Embedding Provider Metrics

Track per-request: latency, batch size, success/failure, cache hit/miss.

#### Step 5.3: Improve Warmup to Test Actual Embedding

```typescript
// warmup route: test actual embedding call
{ name: "embedding", url: `${EMBEDDING_SERVICE_URL}/health` },
// Add: test embedding endpoint
{ name: "embedding-functional", test: async () => {
  const provider = getEmbeddingProvider();
  await provider.embedTexts({ texts: ["warmup test"] });
  return "ok";
}}
```

---

### Phase 6: Add Tests (Recommended)

#### Step 6.1: Unit Tests for `similaritySearchIPC`

- Test that evidence vectors are excluded
- Test deduplication logic
- Test minSimilarity filtering
- Test empty results handling

#### Step 6.2: Integration Test for Full RAG Pipeline

- Ingest a few IPC sections
- Verify retrieval returns only IPC sections
- Verify no evidence contamination

#### Step 6.3: Embedding Provider Tests

- Test timeout handling
- Test retry logic
- Test validation
- Test cache behavior

---

## Summary: Priority Matrix

| Priority | Bug | Fix Complexity | Impact |
|----------|-----|---------------|--------|
| **P0** | BUG 1: Evidence contamination | Medium | Pipeline returns wrong data |
| **P0** | BUG 2: Missing vector index | Low | Every search is slow |
| **P1** | BUG 3: 3s embedding timeout | Trivial | Embeddings fail on cold start |
| **P1** | BUG 4: No embedding retry | Low | Transient failures kill pipeline |
| **P1** | BUG 5: NoopEmbeddings fragility | Medium | Future breakage risk |
| **P2** | BUG 7: No dimension validation | Low | Cryptic errors |
| **P2** | BUG 9: Regex description extraction | Low | Wrong prompt content |
| **P2** | BUG 10: minSimilarity threshold | Low | May filter valid results |
| **P3** | BUG 6: Cache key case mismatch | Trivial | Benign in practice |
| **P3** | BUG 8: store.end() shared pool | Low | Script-only concern |
| **P3** | BUG 11: Warmup incomplete | Trivial | False health reports |
| **P3** | BUG 12: Pool validation | Low | Cold start failures |
| **P3** | BUG 13: Chunk splitting | Medium | Sub-optimal embeddings |
| **P3** | BUG 14: dotenv.config() | Trivial | Env handling conflicts |
| **P3** | BUG 15: No observability | Low | Debugging difficulty |
| **P3** | BUG 16: Validation overhead | Trivial | Minor perf impact |

---

## Estimated Timeline

| Phase | Description | Estimated Time |
|-------|-------------|---------------|
| Phase 1 | Fix critical architecture (evidence contamination + index) | 3-4 hours |
| Phase 2 | Harden embedding provider (timeout, retry, cache) | 1-2 hours |
| Phase 3 | Harden retrieval pipeline (validation, regex, threshold) | 1-2 hours |
| Phase 4 | Fix ingestion pipeline | 1 hour |
| Phase 5 | Add observability & diagnostics | 1-2 hours |
| Phase 6 | Add tests | 2-3 hours |
| **Total** | | **~10-15 hours** |

---

## Immediate Verification Steps

To confirm the evidence contamination bug (BUG 1):

```sql
-- Run this against your Neon database to check for evidence vectors in the IPC table
SELECT 
  metadata->>'sourceType' as source_type,
  COUNT(*) as count
FROM ipc_chunks_embeddings
GROUP BY metadata->>'sourceType';
```

Expected result if BUG 1 is present: you'll see rows with `source_type = 'EVIDENCE'` alongside `null` (IPC) or `'LAW_CHUNK'`.

```sql
-- Check vector count and dimensions
SELECT 
  COUNT(*) as total_vectors,
  array_length(embedding::real[], 1) as dimensions
FROM ipc_chunks_embeddings;
```

If total_vectors is 0, ingestion hasn't run. If dimensions ≠ 384, the model mismatch is another bug.

---

*Generated for CrimeGPT RAG & Embeddings Service*
*Date: 2026-08-26*

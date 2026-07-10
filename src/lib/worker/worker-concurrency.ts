/**
 * Worker concurrency constants.
 *
 * Each worker's concurrency can be tuned via environment variables.
 * Safe integer validation ensures bad env values fall back to sensible defaults
 * suited for free-tier / low-resource deployments.
 *
 * Defaults rationale:
 *   - DOCUMENT_GENERATION: 1  — Gemini calls are slow and expensive; parallel calls waste quota.
 *   - EMBEDDING:           2  — FastAPI is CPU-heavy; allow mild parallelism.
 *   - INGESTION:           1  — Sequential ingestion avoids write contention.
 *   - EMAIL:               2  — Emails are lightweight I/O bound.
 *   - CLEANUP:             1  — Background janitor; no urgency.
 */
function readConcurrency(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export const WORKER_CONCURRENCY = {
  DOCUMENT_GENERATION: readConcurrency("DOCUMENT_GENERATION_CONCURRENCY", 1),
  EMBEDDING: readConcurrency("EMBEDDING_CONCURRENCY", 2),
  INGESTION: readConcurrency("INGESTION_CONCURRENCY", 1),
  EMAIL: readConcurrency("EMAIL_CONCURRENCY", 2),
  CLEANUP: readConcurrency("CLEANUP_CONCURRENCY", 1),
} as const;

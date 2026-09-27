/**
 * Centralized constants for the queue system.
 *
 * All magic numbers live here — no hardcoded values in processors or services.
 * This file is the single source of truth for queue-related configuration.
 */

// ---------------------------------------------------------------------------
// Document Generation
// ---------------------------------------------------------------------------

/** Lock duration for document generation jobs (4 minutes). */
export const DOCUMENT_LOCK_TTL_MS = 240_000;

/** BullMQ stalled interval — must be > lockDuration to avoid false positives. */
export const DOCUMENT_STALLED_INTERVAL_MS = 240_000;

// ---------------------------------------------------------------------------
// AI Temp State (Redis)
// ---------------------------------------------------------------------------

/** TTL for AI temp state in Redis (1 hour). */
export const AI_TEMP_STATE_TTL_SECONDS = 3_600;

/** Redis key prefix for AI temp state. */
export const AI_TEMP_STATE_KEY_PREFIX = 'ai-temp-state';

// ---------------------------------------------------------------------------
// Observability
// ---------------------------------------------------------------------------

/** Max characters for prompt in observability logs. */
export const OBSERVABILITY_PROMPT_MAX_CHARS = 50_000;

/** Max characters for response in observability logs. */
export const OBSERVABILITY_RESPONSE_MAX_CHARS = 50_000;

// ---------------------------------------------------------------------------
// Concurrency Limits
// ---------------------------------------------------------------------------

/**
 * Worker concurrency limits.
 * These control how many jobs each processor handles simultaneously.
 */
export const WORKER_CONCURRENCY = {
  DOCUMENT_GENERATION: 2, // Long-running Gemini calls
  AI_GENERATION: 4, // Fast acknowledgment
  EMBEDDING: 4, // Medium latency (FastAPI HTTP)
  INGESTION: 2, // CPU-bound chunking
  EMAIL: 4, // Fast
  CLEANUP: 1, // Background maintenance
} as const;

/**
 * Job type definitions for the queue system.
 *
 * These types are strict — no `any` allowed.
 * Re-exported from processor.types.ts for backward compatibility.
 */

export type {
  BaseJobPayload,
  DocumentGenerationJobData,
  AIGenerationJobData,
  EmailJobData,
  CleanupJobData,
  EmbeddingSourceType,
  EmbeddingJobData,
  IngestionJobData,
} from './types/processor.types';

// ---------------------------------------------------------------------------
// Legacy type aliases (deprecated — use the new types above)
// ---------------------------------------------------------------------------

import type {
  BaseJobPayload as _BaseJobPayload,
  DocumentGenerationJobData,
  AIGenerationJobData,
  EmailJobData,
  CleanupJobData,
  EmbeddingSourceType as _EmbeddingSourceType,
  EmbeddingJobData,
  IngestionJobData,
} from './types/processor.types';

/** @deprecated Use DocumentGenerationJobData instead */
export type DocumentGenerationJobPayload = DocumentGenerationJobData;

/** @deprecated Use AIGenerationJobData instead */
export type AIGenerationJobPayload = AIGenerationJobData;

/** @deprecated Use EmailJobData instead */
export type EmailJobPayload = EmailJobData;

/** @deprecated Use CleanupJobData instead */
export type CleanupJobPayload = CleanupJobData;

/** @deprecated Use EmbeddingJobData instead */
export type EmbeddingJobPayload = EmbeddingJobData;

/** @deprecated Use IngestionJobData instead */
export type IngestionJobPayload = IngestionJobData;

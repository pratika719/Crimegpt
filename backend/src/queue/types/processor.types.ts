/**
 * Shared type definitions for the queue system.
 *
 * All data structures are explicitly typed — no `any` allowed.
 * These types are used by processors, services, and error classifiers.
 */

// ---------------------------------------------------------------------------
// AI Temp State (Redis)
// ---------------------------------------------------------------------------

/**
 * Status values for AI temp state in Redis.
 * These map 1:1 with BullMQ progress statuses.
 */
export type AiTempStatus =
  | 'RUNNING'
  | 'GENERATING'
  | 'SAVING'
  | 'COMPLETED'
  | 'FAILED';

/**
 * Parameters for writing AI temp state to Redis.
 */
export interface AiTempStateParams {
  readonly requestId: string;
  readonly caseId: string;
  readonly status: AiTempStatus;
  readonly progress: number;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Job Status (Database)
// ---------------------------------------------------------------------------

/**
 * Job status values stored in PostgreSQL.
 */
export type JobStatusType = 'pending' | 'active' | 'completed' | 'failed';

/**
 * Parameters for writing job status to the database.
 */
export interface JobStatusParams {
  readonly jobId: string;
  readonly queueName: string;
  readonly status: JobStatusType;
  readonly userId?: string;
  readonly caseId?: string;
  readonly documentType?: string;
  readonly errorMessage?: string;
  readonly errorCode?: string;
  readonly failureType?: string;
}

// ---------------------------------------------------------------------------
// Error Classification
// ---------------------------------------------------------------------------

/**
 * Classified error result — type-safe error handling.
 */
export interface ClassifiedError {
  readonly code: string;
  readonly message: string;
  readonly userMessage: string;
  readonly failureType: 'transient' | 'permanent';
  readonly isRetryable: boolean;
  readonly isDiscardable: boolean;
}

/**
 * Error classifier function signature.
 * Takes an unknown error and returns a classified result.
 */
export type ErrorClassifierFn = (error: unknown) => ClassifiedError;

/**
 * Error matcher function signature.
 * Returns true if the classifier should handle this error.
 */
export type ErrorMatcherFn = (error: unknown) => boolean;

// ---------------------------------------------------------------------------
// Progress Tracking
// ---------------------------------------------------------------------------

/**
 * Progress update payload — type-safe progress tracking.
 */
export interface ProgressUpdate {
  readonly status: string;
  readonly progress: number;
  readonly message: string;
}

/**
 * Parameters for reporting progress to all tracking systems.
 */
export interface ProgressReportParams {
  readonly requestId: string;
  readonly caseId: string;
  readonly status: string;
  readonly progress: number;
  readonly message: string;
  readonly documentType?: string;
}

// ---------------------------------------------------------------------------
// Job Payloads (Strict Types)
// ---------------------------------------------------------------------------

/**
 * Base payload — all jobs share these fields.
 */
export interface BaseJobPayload {
  readonly requestId: string;
  readonly userId: string;
  readonly createdAt: string;
}

/**
 * Document generation job payload — strict types.
 */
export interface DocumentGenerationJobData extends BaseJobPayload {
  readonly caseId: string;
  readonly documentType: string;
  readonly forceRegenerate?: boolean;
  readonly inputHash?: string;
}

/**
 * AI generation job payload — stub for now.
 */
export interface AIGenerationJobData extends BaseJobPayload {
  readonly caseId: string;
  readonly requestType: string;
  readonly inputHash?: string;
}

/**
 * Email job payload — stub for now.
 */
export interface EmailJobData extends BaseJobPayload {
  readonly to: string;
  readonly subject: string;
  readonly template: 'AI_JOB_COMPLETED' | 'AI_JOB_FAILED' | 'CASE_REPORT_READY';
  readonly data: Record<string, unknown>;
}

/**
 * Cleanup job payload — stub for now.
 */
export interface CleanupJobData extends BaseJobPayload {
  readonly cleanupType:
    | 'EXPIRED_AI_TEMP_STATE'
    | 'OLD_FAILED_JOBS'
    | 'STALE_LOCKS'
    | 'OLD_AUDIT_LOGS';
  readonly olderThanDays?: number;
}

/**
 * Embedding source types.
 */
export type EmbeddingSourceType = 'LAW_CHUNK' | 'EVIDENCE' | 'CASE_DOCUMENT';

/**
 * Embedding job payload — strict types.
 */
export interface EmbeddingJobData extends BaseJobPayload {
  readonly sourceType: EmbeddingSourceType;
  readonly sourceId: string;
  readonly caseId: string;
  readonly chunkIndex: number;
  readonly text: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Ingestion job payload — strict types.
 */
export interface IngestionJobData extends BaseJobPayload {
  readonly sourceType: 'EVIDENCE_TEXT' | 'EVIDENCE_FILE' | 'LAW_CSV';
  readonly sourceId: string;
  readonly caseId: string;
  readonly text: string;
  readonly userId: string;
}

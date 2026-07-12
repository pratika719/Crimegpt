import { logger } from "@/lib/logger";

export type GenerationCorrelation = {
  generationId: string;
  jobId?: string | null;
  caseId: string;
  documentType: string;
};

export type GenerationEvent =
  | "generation_started"
  | "validation_passed"
  | "job_enqueued"
  | "worker_started"
  | "context_loaded"
  | "retrieval_completed"
  | "embedding_completed"
  | "llm_started"
  | "llm_completed"
  | "json_parsed"
  | "schema_validated"
  | "document_saved"
  | "job_completed"
  | "ui_completion_detected";

export function logGenerationEvent(
  event: GenerationEvent,
  correlation: GenerationCorrelation,
  details: Record<string, unknown> = {},
): void {
  logger.info({ event, ...correlation, ...details }, event);
}

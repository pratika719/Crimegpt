import type { Job } from "bullmq";
import type { DocumentGenerationJobPayload } from "@/lib/queue/job-types";
import { setAITempState } from "@/lib/redis/ai-temp-state";
import { documentGeneratorService } from "@/services/document-engine/document-generator.service";
import type { ProgressCallback } from "@/services/document-engine/document-generator.service";
import { NonRetryableError } from "@/lib/error/retryable-error";
import { AIProviderError } from "@/ai/providers/gemini-provider";
import { aiObservabilityService } from "@/services/ai/ai-observability.service";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";
import { jobStatusService } from "@/services/queue/job-status.service";
import { QUEUE_NAMES } from "@/lib/queue/queue-names";
import { logger } from "@/lib/logger";

const GEMINI_MODEL = "gemini-2.5-flash";

export async function processDocumentGenerationJob(
  job: Job<DocumentGenerationJobPayload>,
): Promise<{
  requestId: string;
  caseId: string;
  documentType: string;
  status: "COMPLETED";
}> {
  const { requestId, caseId, userId, documentType } = job.data;

  if (!caseId) {
    throw new NonRetryableError("Document generation job missing caseId.");
  }

  if (!userId) {
    throw new NonRetryableError("Document generation job missing userId.");
  }

  if (!documentType) {
    throw new NonRetryableError("Document generation job missing documentType.");
  }

  logger.info(
    {
      jobId: job.id,
      queueName: job.queueName,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts,
      caseId,
      userId,
      documentType,
    },
    "Document generation job started",
  );

  const startedAt = Date.now();

  // Build a progress callback that updates BullMQ + AI temp state in lockstep
  const onProgress: ProgressCallback = async (status, progress, message) => {
    await job.updateProgress({ status, progress, message });

    const aiStatus = status === "STARTED" ? "RUNNING"
      : status === "COMPLETED" ? "COMPLETED"
      : status === "SAVING" ? "SAVING"
      : status === "FAILED" ? "FAILED"
      : "GENERATING";

    await setAITempState({
      requestId,
      caseId,
      status: aiStatus as any,
      progress,
      message,
      updatedAt: new Date().toISOString(),
      metadata: {
        documentType,
        jobId: job.id,
      },
    });
  };

  try {
    // generateDocument now reports progress via the callback
    // AND always writes rich observability data (prompt, response, tokens) inside the transaction.
    await documentGeneratorService.generateDocument(
      caseId,
      userId,
      documentType,
      requestId,
      onProgress,
    );    // Write job status to DB so frontend polling can read it without Redis
    await jobStatusService.setJobStatus({
      jobId: job.id!,
      queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
      status: "completed",
      userId,
      caseId,
      documentType,
    }).catch((err) => {
      logger.warn({ err, jobId: job.id, caseId }, "Failed to write completed job status to DB — non-fatal");
    });

  logger.info(
    {
      jobId: job.id,
      queueName: job.queueName,
      caseId,
      userId,
      documentType,
      latencyMs: Date.now() - startedAt,
    },
    "Document generation job completed",
  );

    // Invalidate case detail cache so the next page load reflects new document data
    try {
      await cacheInvalidationService.invalidateCaseMutation({ userId, caseId });
    } catch (cacheErr) {
      logger.warn(
        { err: cacheErr, caseId, userId },
        "Failed to invalidate case cache after document generation — non-fatal",
      );
    }
  } catch (error) {
    const maxAttempts = job.opts.attempts ?? 1;
    const isFinal = job.attemptsMade >= maxAttempts - 1;

    logger.error(
      {
        err: error,
        jobId: job.id,
        queueName: job.queueName,
        caseId,
        userId,
        documentType,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
        latencyMs: Date.now() - startedAt,
      },
      "Document generation job failed",
    );

    const errorMessage = error instanceof Error ? error.message : "Unknown AI generation error.";

    // Always set FAILED temp state so UI reflects failure immediately
    await setAITempState({
      requestId,
      caseId,
      status: "FAILED",
      progress: 0,
      message: errorMessage,
      updatedAt: new Date().toISOString(),
      metadata: { documentType, jobId: job.id },
    });

    // Write failure status to DB so frontend can show error without Redis
    await jobStatusService.setJobStatus({
      jobId: job.id!,
      queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
      status: "failed",
      userId,
      caseId,
      documentType,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }).catch((err) => {
      logger.warn({ err, jobId: job.id, caseId }, "Failed to write failed job status to DB — non-fatal");
    });

    // 429 (quota/rate-limit) → discard immediately with user-friendly message
    if (error instanceof AIProviderError && error.statusCode === 429) {
      logger.warn({ err: error, caseId, userId, documentType }, "Gemini quota exhausted (429) — discarding job");
      await job.discard();
      throw new NonRetryableError("AI service is currently overloaded. Please wait a moment and try again.");
    }

    // NonRetryableError → discard immediately (validation failures etc.)
    if (error instanceof NonRetryableError) {
      logger.warn({ err: error, caseId, userId, documentType }, "Non-retryable error — discarding job");
      await job.discard();
      throw error;
    }

    if (isFinal) {
      await aiObservabilityService.logFailure({
        caseId, userId, jobId: job.id, requestType: documentType,
        modelUsed: GEMINI_MODEL, latencyMs: Date.now() - startedAt, failureReason: errorMessage,
      });
    }

    throw error;
  }

  return {
    requestId,
    caseId,
    documentType,
    status: "COMPLETED",
  };
}
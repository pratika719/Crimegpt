import type { Job } from "bullmq";
import type { DocumentGenerationJobPayload } from "@/lib/queue/job-types";
import { setAITempState } from "@/lib/redis/ai-temp-state";
import { documentGeneratorService } from "@/services/document-engine/document-generator.service";
import type { ProgressCallback } from "@/services/document-engine/document-generator.service";
import { NonRetryableError } from "@/lib/error/retryable-error";
import { aiObservabilityService } from "@/services/ai/ai-observability.service";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";
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
    );

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

    // Set FAILED temp state so the UI can immediately reflect the error
    // without waiting for the next polling cycle.
    await setAITempState({
      requestId,
      caseId,
      status: "FAILED",
      progress: 0,
      message: errorMessage,
      updatedAt: new Date().toISOString(),
      metadata: {
        documentType,
        jobId: job.id,
      },
    });

    if (isFinal) {
      await aiObservabilityService.logFailure({
        caseId,
        userId,
        jobId: job.id,
        requestType: documentType,
        modelUsed: GEMINI_MODEL,
        latencyMs: Date.now() - startedAt,
        failureReason: errorMessage,
      });
    }

    // Prevent BullMQ from retrying NonRetryableErrors
    if (error instanceof NonRetryableError) {
      await job.discard();
      logger.info(
        { jobId: job.id, caseId, userId, documentType },
        "Discarded job — non-retryable error",
      );
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
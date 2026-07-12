import type { Job } from "bullmq";
import type { DocumentGenerationJobPayload } from "@/lib/queue/job-types";
import { setAITempState } from "@/lib/redis/ai-temp-state";
import { documentGeneratorService } from "@/services/document-engine/document-generator.service";
import { NonRetryableError } from "@/lib/error/retryable-error";
import { AIProviderError } from "@/ai/providers/gemini-provider";
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

  await job.updateProgress({
    status: "STARTED",
    progress: 5,
    message: "Document generation started.",
  });

  await setAITempState({
    requestId,
    caseId,
    status: "RUNNING",
    progress: 5,
    message: "Document generation started.",
    updatedAt: new Date().toISOString(),
    metadata: {
      documentType,
      jobId: job.id,
    },
  });

  await job.updateProgress({
    status: "BUILDING_CONTEXT",
    progress: 20,
    message: "Building case context.",
  });

  await setAITempState({
    requestId,
    caseId,
    status: "RETRIEVING_CONTEXT",
    progress: 20,
    message: "Building case context and retrieving laws.",
    updatedAt: new Date().toISOString(),
    metadata: {
      documentType,
      jobId: job.id,
    },
  });

  const startedAt = Date.now();

  try {
    await documentGeneratorService.generateDocument(
      caseId,
      userId,
      documentType,
      requestId,
    );

    await aiObservabilityService.logSuccess({
      caseId,
      userId,
      jobId: job.id,
      requestType: documentType,
      modelUsed: GEMINI_MODEL,
      latencyMs: Date.now() - startedAt,
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

    // 429 (quota/rate-limit) → discard immediately, show user-friendly message
    if (error instanceof AIProviderError && error.statusCode === 429) {
      logger.warn(
        { err: error, caseId, userId, documentType },
        "Gemini quota exhausted (429) — discarding job",
      );
      await job.discard();
      throw new NonRetryableError("AI service is currently overloaded. Please wait a moment and try again.");
    }

    // NonRetryableError → discard immediately (validation failures etc.)
    if (error instanceof NonRetryableError) {
      logger.warn(
        { err: error, caseId, userId, documentType },
        "Non-retryable error — discarding job",
      );
      await job.discard();
      throw error;
    }

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

    throw error;
  }

  await job.updateProgress({
    status: "SAVING",
    progress: 90,
    message: "Saving generated document.",
  });

  await setAITempState({
    requestId,
    caseId,
    status: "SAVING",
    progress: 90,
    message: "Saving generated document.",
    updatedAt: new Date().toISOString(),
    metadata: {
      documentType,
      jobId: job.id,
    },
  });

  await job.updateProgress({
    status: "COMPLETED",
    progress: 100,
    message: "Document generation completed.",
  });

  await setAITempState({
    requestId,
    caseId,
    status: "COMPLETED",
    progress: 100,
    message: "Document generation completed.",
    updatedAt: new Date().toISOString(),
    metadata: {
      documentType,
      jobId: job.id,
    },
  });

  return {
    requestId,
    caseId,
    documentType,
    status: "COMPLETED",
  };
}
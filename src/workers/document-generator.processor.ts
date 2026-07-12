import { UnrecoverableError, type Job } from "bullmq";
import type { DocumentGenerationJobPayload } from "@/lib/queue/job-types";

import { documentGeneratorService } from "@/services/document-engine/document-generator.service";
import { documentRepository } from "@/repositories/document.repository";
import { NonRetryableError } from "@/lib/error/retryable-error";
import { aiObservabilityService } from "@/services/ai/ai-observability.service";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";
import { logger } from "@/lib/logger";
import { classifyProviderError as classifyAIError } from "@/lib/error/ai-provider-error-classifier";
import { logGenerationEvent } from "@/lib/ai/generation-diagnostics";

const PRIMARY_PROVIDER = process.env.AI_PROVIDER ?? "groq";
const PRIMARY_MODEL = PRIMARY_PROVIDER === "gemini"
  ? `gemini:${process.env.GEMINI_MODEL ?? "gemini-2.0-flash"}`
  : `groq:${process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"}`;

async function updateDocumentJobProgress(
  job: Job<DocumentGenerationJobPayload>,
  input: {
    requestId: string;
    caseId: string;
    documentType: string;
    stage:
      | "queued"
      | "validating"
      | "warming_ai_service"
      | "retrieving_legal_context"
      | "generating_document"
      | "provider_fallback"
      | "saving_document"
      | "completed"
      | "failed";
    message: string;
    percentage: number;
  },
) {
  const progress = {
    stage: input.stage,
    message: input.message,
    percentage: input.percentage,
  };

  await job.updateProgress(progress);
}

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
  logGenerationEvent("worker_started", {
    generationId: requestId,
    jobId: String(job.id),
    caseId,
    documentType,
  });

  await updateDocumentJobProgress(job, {
    requestId,
    caseId,
    documentType,
    stage: "queued",
    message: "Generation queued",
    percentage: 5,
  });


  const startedAt = Date.now();

  try {
    const generation = await documentGeneratorService.generateDocument(
      caseId,
      userId,
      documentType,
      requestId,
      {
        onStage: (stage, message, percentage) =>
          updateDocumentJobProgress(job, {
            requestId,
            caseId,
            documentType,
            stage,
            message,
            percentage,
          }),
        jobId: String(job.id),
      },
    );

    await aiObservabilityService.logSuccess({
      caseId,
      userId,
      jobId: job.id,
      requestType: documentType,
      modelUsed: `${generation.ai.provider}:${generation.ai.model}`,
      latencyMs: generation.ai.latencyMs,
      retrievedChunksCount: generation.retrievedChunksCount,
      retryCount: job.attemptsMade,
      tokenUsage: {
        ...generation.ai.usage,
        fallbackUsed: generation.ai.fallbackUsed,
        primaryProvider: process.env.AI_PROVIDER ?? "groq",
        fallbackProvider: generation.ai.fallbackUsed ? generation.ai.provider : undefined,
        contextTruncated: generation.contextTruncated,
      },
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
        "Failed to invalidate case cache after document generation - non-fatal",
      );
    }
  } catch (error) {
    const maxAttempts = job.opts.attempts ?? 1;
    const isFinal = job.attemptsMade >= maxAttempts - 1;
    const classified = classifyAIError(error);

    logger.error(
      {
        jobId: job.id,
        queueName: job.queueName,
        caseId,
        userId,
        documentType,
        errorCategory: classified.category,
        retryable: classified.retryable,
        statusCode: classified.statusCode,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
        latencyMs: Date.now() - startedAt,
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      },
      "Document generation job failed",
    );

    if (isFinal) {
      await aiObservabilityService.logFailure({
        caseId,
        userId,
        jobId: job.id,
        requestType: documentType,
        modelUsed: error && typeof error === "object" && "provider" in error && "model" in error
          ? `${String(error.provider)}:${String(error.model)}`
          : PRIMARY_MODEL,
        latencyMs: Date.now() - startedAt,
        failureReason: classified.userMessage,
        errorCode: classified.category,
        retryCount: job.attemptsMade,
      });

      // Mark the GENERATING placeholder document as FAILED in PostgreSQL
      try {
        const placeholderDoc = await documentRepository.findGeneratingByJobId(
          caseId,
          documentType as any,
          String(job.id),
        );
        if (placeholderDoc) {
          await documentRepository.updateToFailed(
            placeholderDoc.id,
            classified.userMessage,
          );
          logger.info(
            { caseId, documentType, documentId: placeholderDoc.id },
            "Marked GENERATING placeholder document as FAILED",
          );
        }
      } catch (dbErr) {
        logger.warn(
          { err: dbErr, caseId, documentType },
          "Failed to update GENERATING placeholder to FAILED — non-fatal",
        );
      }
    }

    await updateDocumentJobProgress(job, {
      requestId,
      caseId,
      documentType,
      stage: "failed",
      message: classified.userMessage,
      percentage: 100,
    });

    if (!classified.retryable) {
      throw new UnrecoverableError(classified.userMessage);
    }

    throw error;
  }

  await updateDocumentJobProgress(job, {
    requestId,
    caseId,
    documentType,
    stage: "completed",
    message: "Document generated successfully",
    percentage: 100,
  });
  logGenerationEvent("job_completed", {
    generationId: requestId,
    jobId: String(job.id),
    caseId,
    documentType,
  }, { documentId: generation.document.id, version: generation.document.version });

  return {
    requestId,
    caseId,
    documentType,
    status: "COMPLETED",
  };
}

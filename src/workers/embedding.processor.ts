import type { Job } from "bullmq";
import type { EmbeddingJobPayload } from "@/lib/queue/job-types";
import { evidenceEmbeddingService } from "@/services/embeddings/evidence-embedding.service";
import { NonRetryableError } from "@/lib/error/retryable-error";
import { logger } from "@/lib/logger";

export async function processEmbeddingJob(job: Job<EmbeddingJobPayload>) {
  const { sourceType, sourceId, caseId, chunkIndex, text, metadata } = job.data;

  // Validation
  if (sourceType !== "EVIDENCE") {
    throw new NonRetryableError(`Unsupported embedding sourceType: ${sourceType}`);
  }

  if (!sourceId) {
    throw new NonRetryableError("Embedding job missing sourceId (evidenceId).");
  }

  if (!caseId) {
    throw new NonRetryableError("Embedding job missing caseId.");
  }

  if (chunkIndex === undefined || chunkIndex === null) {
    throw new NonRetryableError("Embedding job missing chunkIndex.");
  }

  if (!text || !text.trim()) {
    throw new NonRetryableError("Embedding job missing text content.");
  }

  logger.info(
    {
      jobId: job.id,
      queueName: job.queueName,
      caseId,
      evidenceId: sourceId,
      chunkIndex,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts,
    },
    "Embedding job started",
  );

  await job.updateProgress({
    status: "STARTED",
    progress: 10,
    message: "Embedding job started.",
  });

  await job.updateProgress({
    status: "EMBEDDING",
    progress: 60,
    message: "Generating and storing evidence embedding.",
  });

  const startedAt = Date.now();

  try {
    const result = await evidenceEmbeddingService.upsertEvidenceChunk({
      evidenceId: sourceId,
      caseId,
      chunkIndex,
      content: text,
      metadata,
    });

    logger.info(
      {
        jobId: job.id,
        queueName: job.queueName,
        caseId,
        evidenceId: sourceId,
        chunkIndex,
        latencyMs: Date.now() - startedAt,
      },
      "Embedding job completed",
    );

    await job.updateProgress({
      status: "COMPLETED",
      progress: 100,
      message: "Embedding completed.",
    });

    return result;
  } catch (error) {
    logger.error(
      {
        err: error,
        jobId: job.id,
        queueName: job.queueName,
        caseId,
        evidenceId: sourceId,
        chunkIndex,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
        latencyMs: Date.now() - startedAt,
      },
      "Embedding job failed",
    );
    throw error;
  }
}
import type { Job } from "bullmq";
import type { IngestionJobPayload } from "@/lib/queue/job-types";
import { evidenceIngestionService } from "@/services/ingestion/evidence-ingestion.service";
import { NonRetryableError } from "@/lib/error/retryable-error";
import { logger } from "@/lib/logger";

export async function processIngestionJob(job: Job<IngestionJobPayload>) {
  const { sourceType, caseId, text, sourceId, userId } = job.data;

  // Validation
  if (sourceType !== "EVIDENCE_TEXT") {
    throw new NonRetryableError(`Unsupported ingestion sourceType: ${sourceType}`);
  }

  if (!caseId) {
    throw new NonRetryableError("Ingestion job missing caseId.");
  }

  if (!text || !text.trim()) {
    throw new NonRetryableError("Ingestion job missing text content.");
  }

  if (!sourceId) {
    throw new NonRetryableError("Ingestion job missing sourceId.");
  }

  if (!userId) {
    throw new NonRetryableError("Ingestion job missing userId.");
  }

  logger.info(
    {
      jobId: job.id,
      queueName: job.queueName,
      caseId,
      sourceType,
      sourceId,
      userId,
    },
    "Ingestion job started",
  );

  await job.updateProgress({
    status: "STARTED",
    progress: 5,
    message: "Ingestion started.",
  });

  await job.updateProgress({
    status: "CHUNKING",
    progress: 30,
    message: "Chunking evidence text.",
  });

  const startedAt = Date.now();

  try {
    const result = await evidenceIngestionService.ingestEvidenceText({
      evidenceId: sourceId,
      caseId,
      userId,
      text,
    });

    logger.info(
      {
        jobId: job.id,
        queueName: job.queueName,
        caseId,
        sourceType,
        sourceId,
        chunksCount: result.chunksQueued,
        latencyMs: Date.now() - startedAt,
      },
      "Ingestion job completed",
    );

    await job.updateProgress({
      status: "QUEUED_EMBEDDINGS",
      progress: 100,
      message: `Queued ${result.chunksQueued} embedding jobs.`,
    });

    return result;
  } catch (error) {
    logger.error(
      {
        err: error,
        jobId: job.id,
        queueName: job.queueName,
        caseId,
        sourceType,
        sourceId,
        latencyMs: Date.now() - startedAt,
      },
      "Ingestion job failed",
    );
    throw error;
  }
}
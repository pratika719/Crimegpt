import type { Job } from "bullmq";
import type { IngestionJobPayload } from "@/lib/queue/job-types";
import { evidenceIngestionService } from "@/services/ingestion/evidence-ingestion.service";
import { NonRetryableError } from "@/lib/error/retryable-error";

export async function processIngestionJob(job: Job<IngestionJobPayload>) {
  console.log("[ingestion-worker] picked job", {
    id: job.id,
    name: job.name,
    data: job.data,
  });

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

  console.log("[ingestion-worker] chunking evidence", {
    sourceId,
    caseId,
    hasText: Boolean(text),
  });

  const result = await evidenceIngestionService.ingestEvidenceText({
    evidenceId: sourceId,
    caseId,
    userId,
    text,
  });

  console.log("[ingestion-worker] chunk count", result.chunksQueued);
  console.log("[ingestion-worker] queued embedding jobs");

  await job.updateProgress({
    status: "QUEUED_EMBEDDINGS",
    progress: 100,
    message: `Queued ${result.chunksQueued} embedding jobs.`,
  });

  return result;
}
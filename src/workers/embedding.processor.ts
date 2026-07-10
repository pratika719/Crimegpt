import type { Job } from "bullmq";
import type { EmbeddingJobPayload } from "@/lib/queue/job-types";
import { evidenceEmbeddingService } from "@/services/embeddings/evidence-embedding.service";
import { NonRetryableError } from "@/lib/error/retryable-error";

export async function processEmbeddingJob(job: Job<EmbeddingJobPayload>) {
  console.log("[embedding-worker] picked job", job.id);
  
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

  console.log("[embedding-worker] calling FastAPI embedding service");
  const result = await evidenceEmbeddingService.upsertEvidenceChunk({
    evidenceId: sourceId,
    caseId,
    chunkIndex,
    content: text,
    metadata,
  });
  console.log("[embedding-worker] embedding returned");

  await job.updateProgress({
    status: "COMPLETED",
    progress: 100,
    message: "Embedding completed.",
  });

  return result;
}
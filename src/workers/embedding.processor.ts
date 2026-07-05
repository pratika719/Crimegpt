import type { Job } from "bullmq";
import type { EmbeddingJobPayload } from "@/lib/queue/job-types";
import { evidenceEmbeddingService } from "@/services/embeddings/evidence-embedding.service";

export async function processEmbeddingJob(job: Job<EmbeddingJobPayload>) {
  console.log("[embedding-worker] picked job", job.id);
  await job.updateProgress({
    status: "STARTED",
    progress: 10,
    message: "Embedding job started.",
  });

  if (job.data.sourceType === "EVIDENCE") {
    if (!job.data.caseId) {
      throw new Error("Evidence embedding requires caseId.");
    }

    await job.updateProgress({
      status: "EMBEDDING",
      progress: 60,
      message: "Generating and storing evidence embedding.",
    });

    console.log("[embedding-worker] calling FastAPI embedding service");
    const result = await evidenceEmbeddingService.upsertEvidenceChunk({
      evidenceId: job.data.sourceId,
      caseId: job.data.caseId,
      chunkIndex: job.data.chunkIndex ?? 0,
      content: job.data.text,
      metadata: job.data.metadata,
    });
    console.log("[embedding-worker] embedding returned");

    await job.updateProgress({
      status: "COMPLETED",
      progress: 100,
      message: "Embedding completed.",
    });

    return result;
  }

  throw new Error(`Unsupported embedding source type: ${job.data.sourceType}`);
}
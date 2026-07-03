import type { Job } from "bullmq";
import type { EmbeddingJobPayload } from "@/lib/queue/job-types";

export async function processEmbeddingJob(
  job: Job<EmbeddingJobPayload>,
): Promise<{ requestId: string; status: "ACKNOWLEDGED" }> {
  await job.updateProgress({
    status: "ACKNOWLEDGED",
    progress: 10,
    message: "Embedding job received by worker.",
  });

  return {
    requestId: job.data.requestId,
    status: "ACKNOWLEDGED",
  };
}
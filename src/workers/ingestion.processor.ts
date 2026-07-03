import type { Job } from "bullmq";
import type { IngestionJobPayload } from "@/lib/queue/job-types";

export async function processIngestionJob(
  job: Job<IngestionJobPayload>,
): Promise<{ requestId: string; status: "ACKNOWLEDGED" }> {
  await job.updateProgress({
    status: "ACKNOWLEDGED",
    progress: 10,
    message: "Ingestion job received by worker.",
  });

  return {
    requestId: job.data.requestId,
    status: "ACKNOWLEDGED",
  };
}
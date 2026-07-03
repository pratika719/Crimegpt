import type { Job } from "bullmq";
import type { CleanupJobPayload } from "@/lib/queue/job-types";

export async function processCleanupJob(
  job: Job<CleanupJobPayload>,
): Promise<{ requestId: string; status: "ACKNOWLEDGED" }> {
  await job.updateProgress({
    status: "ACKNOWLEDGED",
    progress: 10,
    message: "Cleanup job received by worker.",
  });

  return {
    requestId: job.data.requestId,
    status: "ACKNOWLEDGED",
  };
}
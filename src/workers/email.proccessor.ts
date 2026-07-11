import type { Job } from "bullmq";
import type { EmailJobPayload } from "@/lib/queue/job-types";

export async function processEmailJob(
  job: Job<EmailJobPayload>,
): Promise<{ requestId: string; status: "ACKNOWLEDGED" }> {
  await job.updateProgress({
    status: "ACKNOWLEDGED",
    progress: 10,
    message: "Email job received by worker.",
  });

  return {
    requestId: job.data.requestId,
    status: "ACKNOWLEDGED",
  };
}
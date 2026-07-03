import type { Job } from "bullmq";
import type { AIGenerationJobPayload } from "@/lib/queue/job-types";

export async function processAIGenerationJob(
  job: Job<AIGenerationJobPayload>,
): Promise<{ requestId: string; status: "ACKNOWLEDGED" }> {
  await job.updateProgress({
    status: "ACKNOWLEDGED",
    progress: 10,
    message: "AI generation job received by worker.",
  });

  return {
    requestId: job.data.requestId,
    status: "ACKNOWLEDGED",
  };
}
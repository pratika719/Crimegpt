import { Job } from "bullmq";
import {
  documentGenerationQueue,
  aiGenerationQueue,
  embeddingQueue,
  ingestionQueue,
  emailQueue,
  cleanupQueue,
} from "@/lib/queue/queues";
import { QUEUE_NAMES } from "@/lib/queue/queue-names";

export type MinimalJobState =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused"
  | "unknown";

export type MinimalJobStatusResponse = {
  jobId: string;
  queueName: string;
  state: MinimalJobState;
  failedReason?: string | null;
  result?: unknown;
};

const queueMap = {
  [QUEUE_NAMES.DOCUMENT_GENERATION]: documentGenerationQueue,
  [QUEUE_NAMES.AI_GENERATION]: aiGenerationQueue,
  [QUEUE_NAMES.EMBEDDING]: embeddingQueue,
  [QUEUE_NAMES.INGESTION]: ingestionQueue,
  [QUEUE_NAMES.EMAIL]: emailQueue,
  [QUEUE_NAMES.CLEANUP]: cleanupQueue,
};

export class JobStatusService {
  async getJobStatus(input: {
    queueName: string;
    jobId: string;
  }): Promise<MinimalJobStatusResponse> {
    const queue = queueMap[input.queueName as keyof typeof queueMap];

    if (!queue) {
      return {
        jobId: input.jobId,
        queueName: input.queueName,
        state: "unknown",
        failedReason: "Unknown queue.",
      };
    }

    try {
      const job = await Job.fromId(queue, input.jobId);

      if (!job) {
        return {
          jobId: input.jobId,
          queueName: input.queueName,
          state: "unknown",
          failedReason: "Job not found.",
        };
      }

      const state = await job.getState();

      return {
        jobId: input.jobId,
        queueName: input.queueName,
        state: state as MinimalJobState,
        failedReason: job.failedReason ?? null,
        result: job.returnvalue ?? null,
      };
    } catch (error) {
      console.error(`[JobStatusService] Error fetching job status for ${input.jobId}:`, error);
      return {
        jobId: input.jobId,
        queueName: input.queueName,
        state: "unknown",
        failedReason: "Error retrieving job status.",
      };
    }
  }
}

export const jobStatusService = new JobStatusService();
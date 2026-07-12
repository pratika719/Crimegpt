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
import { logger } from "@/lib/logger";
import { classifyProviderError as classifyAIError } from "@/lib/error/ai-provider-error-classifier";

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
  stage?: string | null;
  message?: string | null;
  percentage?: number | null;
  failedReason?: string | null;
  retryable?: boolean | null;
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
    userId?: string;
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

      // Owner verification (Step 9)
      const jobUserId = typeof job.data?.userId === "string" ? job.data.userId : null;
      if (input.userId && jobUserId && jobUserId !== input.userId) {
        return {
          jobId: input.jobId,
          queueName: input.queueName,
          state: "unknown",
          failedReason: "Job not found or access denied.",
        };
      }

      const state = await job.getState();
      const progress =
        typeof job.progress === "object" && job.progress !== null
          ? (job.progress as {
              stage?: string;
              message?: string;
              percentage?: number;
            })
          : null;
      const classifiedFailure =
        state === "failed" && job.failedReason
          ? classifyAIError(new Error(job.failedReason))
          : null;

      return {
        jobId: input.jobId,
        queueName: input.queueName,
        state: state as MinimalJobState,
        stage: progress?.stage ?? null,
        message:
          state === "failed"
            ? classifiedFailure?.userMessage ?? "AI generation failed. Please try again."
            : progress?.message ?? null,
        percentage: progress?.percentage ?? null,
        failedReason:
          state === "failed"
            ? classifiedFailure?.userMessage ?? job.failedReason ?? null
            : job.failedReason ?? null,
        retryable: classifiedFailure?.retryable ?? null,
        result: job.returnvalue ?? null,
      };
    } catch (error) {
      logger.error(
        {
          err: error,
          jobId: input.jobId,
          queueName: input.queueName,
        },
        "Error fetching job status",
      );
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

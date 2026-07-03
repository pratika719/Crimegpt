import { Job } from "bullmq";
import {
  documentGenerationQueue,
  aiGenerationQueue,
  embeddingQueue,
  ingestionQueue,
  emailQueue,
  cleanupQueue,
} from "@/lib/queue/queues";
import { QUEUE_NAMES, type QueueName } from "@/lib/queue/queue-names";

export type JobStatusResponse = {
  jobId: string;
  queueName: QueueName;
  state:
    | "completed"
    | "failed"
    | "delayed"
    | "active"
    | "waiting"
    | "waiting-children"
    | "prioritized"
    | "unknown";
  progress: unknown;
  returnvalue: unknown;
  failedReason?: string;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
};

const queues = {
  [QUEUE_NAMES.DOCUMENT_GENERATION]: documentGenerationQueue,
  [QUEUE_NAMES.AI_GENERATION]: aiGenerationQueue,
  [QUEUE_NAMES.EMBEDDING]: embeddingQueue,
  [QUEUE_NAMES.INGESTION]: ingestionQueue,
  [QUEUE_NAMES.EMAIL]: emailQueue,
  [QUEUE_NAMES.CLEANUP]: cleanupQueue,
};

export class JobStatusService {
  async getJobStatus(
    queueName: QueueName,
    jobId: string,
  ): Promise<JobStatusResponse | null> {
    const queue = queues[queueName];

    if (!queue) {
      return null;
    }

    const job = await Job.fromId(queue, jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      jobId: String(job.id),
      queueName,
      state,
      progress: job.progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }
}

export const jobStatusService = new JobStatusService();
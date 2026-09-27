import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue-names';
import {
  AIGenerationJobPayload,
  DocumentGenerationJobPayload,
  EmbeddingJobPayload,
  EmailJobPayload,
  CleanupJobPayload,
  IngestionJobPayload,
} from './job-types';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.DOCUMENT_GENERATION)
    private documentQueue: Queue<DocumentGenerationJobPayload>,
    @InjectQueue(QUEUE_NAMES.AI_GENERATION)
    private aiQueue: Queue<AIGenerationJobPayload>,
    @InjectQueue(QUEUE_NAMES.EMBEDDING)
    private embeddingQueue: Queue<EmbeddingJobPayload>,
    @InjectQueue(QUEUE_NAMES.INGESTION)
    private ingestionQueue: Queue<IngestionJobPayload>,
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private emailQueue: Queue<EmailJobPayload>,
    @InjectQueue(QUEUE_NAMES.CLEANUP)
    private cleanupQueue: Queue<CleanupJobPayload>,
  ) {}

  async getJobCounts(queueName: string) {
    const queue = this.getQueue(queueName);
    return queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );
  }

  async addJob(queueName: string, data: unknown, opts?: { delay?: number }) {
    const queue = this.getQueue(queueName);
    const job = await queue.add(queueName, data as any, opts);
    this.logger.log(`Added job ${job.id} to ${queueName}`);
    return job;
  }

  async getJobStatus(queueName: string, jobId: string) {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);
      if (!job) {
        return {
          jobId,
          queueName,
          state: 'unknown',
          failedReason: 'Job not found',
        };
      }
      const rawState = await job.getState();
      const state = rawState === 'waiting' || rawState === 'delayed' ? 'pending' : rawState;
      return {
        jobId,
        queueName,
        state,
        failedReason: job.failedReason ?? null,
        documentId: (job.returnvalue as any)?.documentId ?? null,
        result: job.returnvalue ?? null,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to get job status for ${jobId} in ${queueName}: ${err.message}`);
      return {
        jobId,
        queueName,
        state: 'unknown',
        failedReason: err.message,
      };
    }
  }

  private getQueue(name: string): Queue {
    const queues: Record<string, Queue> = {
      [QUEUE_NAMES.DOCUMENT_GENERATION]: this.documentQueue,
      [QUEUE_NAMES.AI_GENERATION]: this.aiQueue,
      [QUEUE_NAMES.EMBEDDING]: this.embeddingQueue,
      [QUEUE_NAMES.INGESTION]: this.ingestionQueue,
      [QUEUE_NAMES.EMAIL]: this.emailQueue,
      [QUEUE_NAMES.CLEANUP]: this.cleanupQueue,
    };
    const queue = queues[name];
    if (!queue) {
      throw new Error(`Unknown queue: ${name}`);
    }
    return queue;
  }
}

/**
 * Embedding Processor — delegates to EvidenceEmbeddingService.
 *
 * Responsibilities:
 * 1. Validate payload
 * 2. Report progress
 * 3. Delegate to service
 *
 * Does NOT contain embedding logic.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue-names';
import { NonRetryableError } from '../errors/error-classifier';
import { EvidenceEmbeddingService } from '@/modules/evidence/services/evidence-embedding.service';
import type { EmbeddingJobData } from '../types/processor.types';

@Processor(QUEUE_NAMES.EMBEDDING, {
  concurrency: 4,
})
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(
    private readonly evidenceEmbedding: EvidenceEmbeddingService,
  ) {
    super();
  }

  async process(
    job: Job<EmbeddingJobData>,
  ): Promise<{
    evidenceId: string;
    caseId: string;
    chunkIndex: number;
    embedded: boolean;
  }> {
    const { sourceId, caseId, chunkIndex, text, metadata } = job.data;

    this.validatePayload(job.data);

    await job.updateProgress({
      status: 'STARTED',
      progress: 10,
      message: 'Embedding started.',
    });

    const startedAt = Date.now();

    try {
      const result = await this.evidenceEmbedding.upsertEvidenceChunk({
        evidenceId: sourceId,
        caseId,
        chunkIndex,
        content: text,
        metadata,
      });

      this.logger.log(
        {
          jobId: job.id,
          caseId,
          evidenceId: sourceId,
          chunkIndex,
          latencyMs: Date.now() - startedAt,
        },
        'Embedding completed',
      );

      await job.updateProgress({
        status: 'COMPLETED',
        progress: 100,
        message: 'Embedding completed.',
      });

      return result;
    } catch (error) {
      this.logger.error(
        {
          err: error,
          jobId: job.id,
          caseId,
          evidenceId: sourceId,
          chunkIndex,
        },
        'Embedding failed',
      );
      throw error;
    }
  }

  private validatePayload(data: EmbeddingJobData): void {
    if (data.sourceType !== 'EVIDENCE') {
      throw new NonRetryableError(`Unsupported sourceType: ${data.sourceType}`);
    }
    if (!data.sourceId) throw new NonRetryableError('Missing sourceId.');
    if (!data.caseId) throw new NonRetryableError('Missing caseId.');
    if (data.chunkIndex === undefined) {
      throw new NonRetryableError('Missing chunkIndex.');
    }
    if (!data.text?.trim()) throw new NonRetryableError('Missing text content.');
  }
}

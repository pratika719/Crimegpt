/**
 * Ingestion Processor — delegates to EvidenceIngestionService.
 *
 * Responsibilities:
 * 1. Validate payload
 * 2. Report progress
 * 3. Delegate to service
 *
 * Does NOT contain ingestion/chunking logic.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue-names';
import { NonRetryableError } from '../errors/error-classifier';
import { EvidenceIngestionService } from '@/modules/evidence/services/evidence-ingestion.service';
import type { IngestionJobData } from '../types/processor.types';

@Processor(QUEUE_NAMES.INGESTION, {
  concurrency: 2,
})
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly evidenceIngestion: EvidenceIngestionService,
  ) {
    super();
  }

  async process(
    job: Job<IngestionJobData>,
  ): Promise<{
    evidenceId: string;
    caseId: string;
    chunksQueued: number;
  }> {
    const { caseId, text, sourceId, userId } = job.data;

    this.validatePayload(job.data);

    await job.updateProgress({
      status: 'STARTED',
      progress: 5,
      message: 'Ingestion started.',
    });

    await job.updateProgress({
      status: 'CHUNKING',
      progress: 30,
      message: 'Chunking evidence text.',
    });

    const startedAt = Date.now();

    try {
      const result = await this.evidenceIngestion.ingestEvidenceText({
        evidenceId: sourceId,
        caseId,
        userId,
        text,
      });

      this.logger.log(
        {
          jobId: job.id,
          caseId,
          chunksCount: result.chunksQueued,
          latencyMs: Date.now() - startedAt,
        },
        'Ingestion completed',
      );

      await job.updateProgress({
        status: 'QUEUED_EMBEDDINGS',
        progress: 100,
        message: `Queued ${result.chunksQueued} embedding jobs.`,
      });

      return result;
    } catch (error) {
      this.logger.error(
        { err: error, jobId: job.id, caseId },
        'Ingestion failed',
      );
      throw error;
    }
  }

  private validatePayload(data: IngestionJobData): void {
    if (data.sourceType !== 'EVIDENCE_TEXT') {
      throw new NonRetryableError(`Unsupported sourceType: ${data.sourceType}`);
    }
    if (!data.caseId) throw new NonRetryableError('Missing caseId.');
    if (!data.text?.trim()) throw new NonRetryableError('Missing text content.');
    if (!data.sourceId) throw new NonRetryableError('Missing sourceId.');
    if (!data.userId) throw new NonRetryableError('Missing userId.');
  }
}

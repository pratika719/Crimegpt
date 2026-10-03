/**
 * AI Generation Processor — stub processor.
 *
 * Currently just acknowledges the job.
 * Future: will handle AI generation requests outside document generation.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue-names';
import type { AIGenerationJobData } from '../types/processor.types';

@Processor(QUEUE_NAMES.AI_GENERATION)
export class AIGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(AIGenerationProcessor.name);

  async process(
    job: Job<AIGenerationJobData>,
  ): Promise<{ requestId: string; status: 'ACKNOWLEDGED' }> {
    this.logger.debug(
      { jobId: job.id, requestId: job.data.requestId },
      'AI generation job acknowledged',
    );

    await job.updateProgress({
      status: 'ACKNOWLEDGED',
      progress: 10,
      message: 'AI generation job received.',
    });

    return { requestId: job.data.requestId, status: 'ACKNOWLEDGED' };
  }
}

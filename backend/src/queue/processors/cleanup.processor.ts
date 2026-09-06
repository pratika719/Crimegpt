/**
 * Cleanup Processor — stub processor.
 *
 * Currently just acknowledges the job.
 * Future: will handle cleanup tasks (expired temp state, old jobs, etc.).
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue-names';
import type { CleanupJobData } from '../types/processor.types';

@Processor(QUEUE_NAMES.CLEANUP)
export class CleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(CleanupProcessor.name);

  async process(
    job: Job<CleanupJobData>,
  ): Promise<{ requestId: string; status: 'ACKNOWLEDGED' }> {
    this.logger.debug(
      { jobId: job.id, requestId: job.data.requestId, cleanupType: job.data.cleanupType },
      'Cleanup job acknowledged',
    );

    await job.updateProgress({
      status: 'ACKNOWLEDGED',
      progress: 10,
      message: 'Cleanup job received.',
    });

    return { requestId: job.data.requestId, status: 'ACKNOWLEDGED' };
  }
}

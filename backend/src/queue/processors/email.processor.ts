/**
 * Email Processor — stub processor.
 *
 * Currently just acknowledges the job.
 * Future: will handle email notifications.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue-names';
import type { EmailJobData } from '../types/processor.types';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(
    job: Job<EmailJobData>,
  ): Promise<{ requestId: string; status: 'ACKNOWLEDGED' }> {
    this.logger.debug(
      { jobId: job.id, requestId: job.data.requestId },
      'Email job acknowledged',
    );

    await job.updateProgress({
      status: 'ACKNOWLEDGED',
      progress: 10,
      message: 'Email job received.',
    });

    return { requestId: job.data.requestId, status: 'ACKNOWLEDGED' };
  }
}

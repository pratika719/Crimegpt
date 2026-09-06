/**
 * Progress Tracker — centralized progress tracking for all processors.
 *
 * Handles:
 * - BullMQ job.updateProgress()
 * - Redis AI temp state (for real-time UI)
 * - DB job status persistence
 *
 * Eliminates duplicated progress tracking code across processors.
 * All operations are fire-and-forget: failures are logged but never abort.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiTempStateService } from './ai-temp-state.service';
import { JobStatusService } from './job-status.service';
import type {
  AiTempStatus,
  JobStatusType,
} from '../types/processor.types';

@Injectable()
export class ProgressTracker {
  private readonly logger = new Logger(ProgressTracker.name);

  constructor(
    private readonly aiTempState: AiTempStateService,
    private readonly jobStatus: JobStatusService,
  ) {}

  /**
   * Report progress to all tracking systems.
   */
  async reportProgress(
    job: Job,
    params: {
      requestId: string;
      caseId: string;
      status: string;
      progress: number;
      message: string;
      documentType?: string;
    },
  ): Promise<void> {
    // 1. BullMQ progress
    await job.updateProgress({
      status: params.status,
      progress: params.progress,
      message: params.message,
    });

    // 2. Redis temp state (for real-time UI polling)
    const aiStatus = this.mapToAiTempStatus(params.status);
    await this.aiTempState.write({
      requestId: params.requestId,
      caseId: params.caseId,
      status: aiStatus,
      progress: params.progress,
      message: params.message,
      metadata: {
        documentType: params.documentType,
        jobId: job.id,
      },
    });
  }

  /**
   * Write job status to DB (fire-and-forget).
   */
  async writeJobStatus(
    job: Job,
    params: {
      status: JobStatusType;
      userId?: string;
      caseId?: string;
      documentType?: string;
      errorMessage?: string;
      errorCode?: string;
      failureType?: string;
    },
  ): Promise<void> {
    await this.jobStatus.setJobStatus({
      jobId: String(job.id),
      queueName: job.queueName,
      ...params,
    });
  }

  /**
   * Write failure state to all tracking systems.
   */
  async reportFailure(
    job: Job,
    params: {
      requestId: string;
      caseId: string;
      errorCode: string;
      userMessage: string;
      failureType: string;
      documentType?: string;
    },
  ): Promise<void> {
    // Redis temp state
    await this.aiTempState.write({
      requestId: params.requestId,
      caseId: params.caseId,
      status: 'FAILED',
      progress: 0,
      message: params.userMessage,
      metadata: {
        documentType: params.documentType,
        jobId: job.id,
        errorCode: params.errorCode,
        failureType: params.failureType,
      },
    });

    // DB status
    await this.writeJobStatus(job, {
      status: 'failed',
      errorMessage: params.userMessage,
      errorCode: params.errorCode,
      failureType: params.failureType,
    });
  }

  /**
   * Map BullMQ status to AI temp status.
   */
  private mapToAiTempStatus(status: string): AiTempStatus {
    const statusMap: Record<string, AiTempStatus> = {
      STARTED: 'RUNNING',
      BUILDING_CONTEXT: 'GENERATING',
      RETRIEVING_CONTEXT: 'GENERATING',
      GENERATING: 'GENERATING',
      SAVING: 'SAVING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
    };
    return statusMap[status] ?? 'GENERATING';
  }
}

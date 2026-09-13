/**
 * Document Generation Processor — thin orchestrator.
 *
 * Responsibilities:
 * 1. Validate job payload
 * 2. Initialize progress tracking
 * 3. Delegate to DocumentGeneratorService
 * 4. Handle success/failure routing
 *
 * Does NOT contain:
 * - Business logic (in DocumentGeneratorService)
 * - Error classification (in ErrorClassifier)
 * - Progress tracking details (in ProgressTracker)
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue-names';
import { DOCUMENT_LOCK_TTL_MS, DOCUMENT_STALLED_INTERVAL_MS } from '../constants/queue.constants';
import { ErrorClassifier, NonRetryableError } from '../errors/error-classifier';
import { DocumentType } from '../../document/document-registry';
import type { AIRequestType } from '@/generated/prisma/client';
import { ProgressTracker } from '../services/progress-tracker.service';
import { CacheInvalidationService } from '../services/cache-invalidation.service';
import { AiObservabilityService } from '../../ai/services/ai-observability.service';
import { DocumentGeneratorService } from '../../document/document-generator.service';
import type { ProgressCallback } from '../../document/document-generator.service';
import type { DocumentGenerationJobData } from '../types/processor.types';

@Processor(QUEUE_NAMES.DOCUMENT_GENERATION, {
  lockDuration: DOCUMENT_LOCK_TTL_MS,
  stalledInterval: DOCUMENT_STALLED_INTERVAL_MS,
})
export class DocumentGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentGenerationProcessor.name);

  constructor(
    private readonly documentGenerator: DocumentGeneratorService,
    private readonly progressTracker: ProgressTracker,
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly aiObservability: AiObservabilityService,
    private readonly errorClassifier: ErrorClassifier,
  ) {
    super();
  }

  async process(
    job: Job<DocumentGenerationJobData>,
  ): Promise<{
    requestId: string;
    caseId: string;
    documentType: string;
    status: 'COMPLETED';
    documentId: string;
  }> {
    const { requestId, caseId, userId, documentType } = job.data;
    const startedAt = Date.now();

    this.validatePayload(job.data);
    await this.initializeJob(job);

    const onProgress = this.createProgressCallback(job);

    try {
      const result = await this.documentGenerator.generateDocument(
        caseId,
        userId,
        documentType as DocumentType,
        { requestId, onProgress },
      );

      await this.handleSuccess(job);
      return {
        requestId,
        caseId,
        documentType,
        status: 'COMPLETED',
        documentId: result.document.id,
      };
    } catch (error) {
      await this.handleFailure(job, error, startedAt);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers — each does ONE thing
  // -------------------------------------------------------------------------

  private validatePayload(data: DocumentGenerationJobData): void {
    if (!data.caseId) throw new NonRetryableError('Job missing caseId.');
    if (!data.userId) throw new NonRetryableError('Job missing userId.');
    if (!data.documentType) {
      throw new NonRetryableError('Job missing documentType.');
    }
  }

  private async initializeJob(
    job: Job<DocumentGenerationJobData>,
  ): Promise<void> {
    const { requestId, caseId, userId, documentType } = job.data;

    await this.progressTracker.writeJobStatus(job, {
      status: 'active',
      userId,
      caseId,
      documentType,
    });

    await this.progressTracker.reportProgress(job, {
      requestId,
      caseId,
      status: 'STARTED',
      progress: 5,
      message: 'Document generation started.',
      documentType,
    });
  }

  private createProgressCallback(
    job: Job<DocumentGenerationJobData>,
  ): ProgressCallback {
    const { requestId, caseId, documentType } = job.data;

    return async (
      status: string,
      progress: number,
      message: string,
    ): Promise<void> => {
      await this.progressTracker.reportProgress(job, {
        requestId,
        caseId,
        status,
        progress,
        message,
        documentType,
      });
    };
  }

  private async handleSuccess(
    job: Job<DocumentGenerationJobData>,
  ): Promise<void> {
    const { caseId, userId, documentType } = job.data;

    await this.progressTracker.writeJobStatus(job, {
      status: 'completed',
      userId,
      caseId,
      documentType,
    });

    await this.cacheInvalidation
      .invalidateCaseMutation({ userId, caseId })
      .catch((err) => {
        this.logger.warn({ err, caseId }, 'Cache invalidation failed');
      });

    this.logger.log({ jobId: job.id, caseId }, 'Document generation completed');
  }

  private async handleFailure(
    job: Job<DocumentGenerationJobData>,
    error: unknown,
    startedAt: number,
  ): Promise<void> {
    const { requestId, caseId, userId, documentType } = job.data;
    const classified = this.errorClassifier.classify(error);

    await this.progressTracker.reportFailure(job, {
      requestId,
      caseId,
      errorCode: classified.code,
      userMessage: classified.userMessage,
      failureType: classified.failureType,
      documentType,
    });

    // Log observability for final attempts or non-retryable errors
    if (this.isFinalAttempt(job) || !classified.isRetryable) {
      // Map document type to AI request type
      const requestType = this.mapDocumentTypeToRequestType(documentType);
      await this.aiObservability.logRequest(userId, {
        requestType,
        prompt: '',
        response: '',
        latencyMs: Date.now() - startedAt,
        caseId,
      });
    }

    // Discard immediately if error is not retryable
    // Note: job.discard() may not be available in all BullMQ versions
    if (classified.isDiscardable) {
      this.logger.warn(
        { jobId: job.id, code: classified.code },
        'Non-retryable error — job will not be retried',
      );
    }

    this.logger.error(
      {
        jobId: job.id,
        caseId,
        code: classified.code,
        latencyMs: Date.now() - startedAt,
      },
      'Document generation failed',
    );
  }

  private isFinalAttempt(job: Job): boolean {
    return job.attemptsMade >= (job.opts.attempts ?? 1) - 1;
  }

  private mapDocumentTypeToRequestType(documentType: string): AIRequestType {
    const mapping: Record<string, AIRequestType> = {
      [DocumentType.FIR]: 'FIR_GENERATION',
      [DocumentType.INVESTIGATION_SUMMARY]: 'INVESTIGATION_SUMMARY',
      [DocumentType.CHARGE_SHEET]: 'CHARGE_SHEET',
      [DocumentType.LEGAL_ANALYSIS]: 'LEGAL_ANALYSIS',
      [DocumentType.REMAND_REQUEST]: 'REMAND_REQUEST_GENERATION',
      [DocumentType.CASE_DIARY]: 'CASE_DIARY_GENERATION',
    };
    return mapping[documentType] ?? 'LEGAL_ANALYSIS';
  }
}

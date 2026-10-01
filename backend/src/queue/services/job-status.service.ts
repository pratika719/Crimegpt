/**
 * Job Status Service — persists job status to PostgreSQL.
 *
 * Allows frontend polling without Redis dependency.
 * All operations are fire-and-forget: failures are logged but never abort.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { JobStatusParams } from '../types/processor.types';

@Injectable()
export class JobStatusService {
  private readonly logger = new Logger(JobStatusService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert job status in the database.
   */
  async setJobStatus(params: JobStatusParams): Promise<void> {
    try {
      await this.prisma.jobStatus.upsert({
        where: { id: params.jobId },
        create: {
          id: params.jobId,
          queueName: params.queueName,
          status: params.status,
          userId: params.userId,
          caseId: params.caseId,
          documentType: params.documentType,
          errorMessage: params.errorMessage,
          errorCode: params.errorCode,
          failureType: params.failureType,
        },
        update: {
          status: params.status,
          errorMessage: params.errorMessage,
          errorCode: params.errorCode,
          failureType: params.failureType,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(
        { err, jobId: params.jobId },
        'Failed to write job status — non-fatal',
      );
    }
  }

  /**
   * Retrieve job status by ID.
   */
  async getJobStatus(jobId: string) {
    return this.prisma.jobStatus.findUnique({ where: { id: jobId } });
  }

  /**
   * Get active and recently failed jobs for a case.
   */
  async getCaseJobs(caseId: string) {
    const activeCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const activeJobs = await this.prisma.jobStatus.findMany({
      where: {
        caseId,
        status: { in: ['pending', 'active'] },
        updatedAt: { gte: activeCutoff },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        queueName: true,
        documentType: true,
        status: true,
        updatedAt: true,
      },
    });

    const failedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedJobs = await this.prisma.jobStatus.findMany({
      where: {
        caseId,
        status: 'failed',
        updatedAt: { gte: failedCutoff },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        queueName: true,
        documentType: true,
        errorMessage: true,
        errorCode: true,
        failureType: true,
        updatedAt: true,
      },
    });

    return {
      activeJobs,
      failedJobs,
    };
  }
}

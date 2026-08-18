import { logger } from "@/lib/logger";
import { jobStatusRepository } from "@/features/case/repositories/job-status.repository";
import { prisma } from "@/lib/prisma";

export type MinimalJobState =
  | "pending"
  | "active"
  | "completed"
  | "failed"
  | "unknown";

export type MinimalJobStatusResponse = {
  jobId: string;
  queueName: string;
  state: MinimalJobState;
  failedReason?: string | null;
  errorCode?: string | null;
  failureType?: string | null;
  documentId?: string | null;
};

export class JobStatusService {
  async getJobStatus(input: {
    queueName: string;
    jobId: string;
    userId?: string;
  }): Promise<MinimalJobStatusResponse> {
    try {
      const record = await jobStatusRepository.findById(input.jobId);

      if (!record) {
        return {
          jobId: input.jobId,
          queueName: input.queueName,
          state: "unknown",
          failedReason: "Job not found.",
        };
      }

      // Owner verification
      if (input.userId && record.userId && record.userId !== input.userId) {
        return {
          jobId: input.jobId,
          queueName: input.queueName,
          state: "unknown",
          failedReason: "Job not found or access denied.",
        };
      // Check for stale abandoned jobs (pending/active for > 10 minutes)
      const STALE_JOB_THRESHOLD_MS = 10 * 60 * 1000;
      const isStale = (record.status === "pending" || record.status === "active") &&
                      (Date.now() - new Date(record.updatedAt).getTime() > STALE_JOB_THRESHOLD_MS);

      if (isStale) {
        const timeoutMsg = "Document generation timed out — background worker was offline or abandoned the job.";
        await jobStatusRepository.upsert({
          id: record.id,
          queueName: record.queueName,
          status: "failed",
          userId: record.userId ?? undefined,
          caseId: record.caseId ?? undefined,
          documentType: record.documentType ?? undefined,
          errorMessage: timeoutMsg,
          errorCode: "JOB_TIMEOUT",
          failureType: "transient",
        }).catch((err) => logger.warn({ err, jobId: record.id }, "Failed to update stale job status in DB"));

        return {
          jobId: input.jobId,
          queueName: input.queueName,
          state: "failed",
          failedReason: timeoutMsg,
          errorCode: "JOB_TIMEOUT",
          failureType: "transient",
        };
      }

      let documentId: string | null = null;
      if (record.status === "completed" && record.caseId && record.documentType) {
        const latestDoc = await prisma.generatedDocument.findFirst({
          where: {
            caseId: record.caseId,
            type: record.documentType as any,
          },
          orderBy: {
            version: "desc",
          },
          select: {
            id: true,
          },
        });
        documentId = latestDoc?.id ?? null;
      }

      return {
        jobId: input.jobId,
        queueName: input.queueName,
        state: record.status as MinimalJobState,
        failedReason: record.errorMessage ?? null,
        errorCode: record.errorCode ?? null,
        failureType: record.failureType ?? null,
        documentId,
      };
    } catch (error) {
      logger.error(
        {
          err: error,
          jobId: input.jobId,
          queueName: input.queueName,
        },
        "Error fetching job status from DB",
      );
      return {
        jobId: input.jobId,
        queueName: input.queueName,
        state: "unknown",
        failedReason: "Error retrieving job status.",
      };
    }
  }

  /**
   * Creates or updates a job status record in the database.
   * Used by queue producers and workers instead of writing to Redis.
   */
  async setJobStatus(input: {
    jobId: string;
    queueName: string;
    status: "pending" | "active" | "completed" | "failed";
    userId?: string;
    caseId?: string;
    documentType?: string;
    errorMessage?: string;
    errorCode?: string;
    failureType?: string;
  }): Promise<void> {
    try {
      await jobStatusRepository.upsert({
        id: input.jobId,
        queueName: input.queueName,
        status: input.status,
        userId: input.userId,
        caseId: input.caseId,
        documentType: input.documentType,
        errorMessage: input.errorMessage,
        errorCode: input.errorCode,
        failureType: input.failureType,
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          jobId: input.jobId,
          queueName: input.queueName,
          status: input.status,
        },
        "Error setting job status in DB",
      );
    }
  }
}

export const jobStatusService = new JobStatusService();
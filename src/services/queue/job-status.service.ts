import { logger } from "@/lib/logger";
import { jobStatusRepository } from "@/repositories/job-status.repository";

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
      }

      return {
        jobId: input.jobId,
        queueName: input.queueName,
        state: record.status as MinimalJobState,
        failedReason: record.errorMessage ?? null,
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
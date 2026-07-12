import { aiRequestLogRepository } from "@/repositories/ai-request-log.repository";
import { logger } from "@/lib/logger";

type LogAISuccessInput = {
  caseId?: string;
  userId: string;
  jobId?: string;
  requestType: string;
  modelUsed?: string;
  latencyMs: number;
  retrievedChunksCount?: number;
  cacheHit?: boolean;
  tokenUsage?: Record<string, unknown>;
  retryCount?: number;
  errorCode?: string;
};

type LogAIFailureInput = {
  caseId?: string;
  userId: string;
  jobId?: string;
  requestType: string;
  modelUsed?: string;
  latencyMs?: number;
  retrievedChunksCount?: number;
  cacheHit?: boolean;
  tokenUsage?: Record<string, unknown>;
  retryCount?: number;
  errorCode?: string;
  failureReason: string;
};

function truncateFailureReason(reason: string): string {
  return reason.length > 1000 ? `${reason.slice(0, 1000)}...` : reason;
}

export class AIObservabilityService {
  async logSuccess(input: LogAISuccessInput): Promise<void> {
    try {
      await aiRequestLogRepository.create({
        ...input,
        status: "SUCCESS",
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          caseId: input.caseId,
          userId: input.userId,
          jobId: input.jobId,
          requestType: input.requestType,
        },
        "Failed to write AI observability log for success",
      );
    }
  }

  async logFailure(input: LogAIFailureInput): Promise<void> {
    try {
      await aiRequestLogRepository.create({
        ...input,
        status: "FAILED",
        failureReason: truncateFailureReason(input.failureReason),
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          caseId: input.caseId,
          userId: input.userId,
          jobId: input.jobId,
          requestType: input.requestType,
        },
        "Failed to write AI observability log for failure",
      );
    }
  }
}

export const aiObservabilityService = new AIObservabilityService();
export default aiObservabilityService;

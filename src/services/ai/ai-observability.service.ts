import { aiRequestLogRepository } from "@/repositories/ai-request-log.repository";

type LogAISuccessInput = {
  caseId?: string;
  userId: string;
  jobId?: string;
  requestType: string;
  modelUsed?: string;
  latencyMs: number;
  retrievedChunksCount?: number;
  cacheHit?: boolean;
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
      console.warn("[ai-observability] failed to log success", error);
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
      console.warn("[ai-observability] failed to log failure", error);
    }
  }
}

export const aiObservabilityService = new AIObservabilityService();
export default aiObservabilityService;

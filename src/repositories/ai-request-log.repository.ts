import { prisma } from "@/lib/prisma";
import { AIRequestType } from "@/generated/prisma/client";

export class AIRequestLogRepository {
  /**
   * Persists an AI request/RAG observability log.
   */
  async create(data: {
    requestType: AIRequestType;
    prompt: string;
    retrievedContext?: string;
    response: string;
    latencyMs?: number;
    modelUsed?: string;
    tokenUsage?: number;
    caseId?: string;
  }) {
    return prisma.aIRequestLog.create({
      data,
    });
  }
}

export const aiRequestLogRepository = new AIRequestLogRepository();
export default aiRequestLogRepository;

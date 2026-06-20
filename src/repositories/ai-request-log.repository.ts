import { prisma } from "@/lib/prisma";
import { AIRequestType } from "@/generated/prisma/client";

export class AIRequestLogRepository {
  /**
   * Persists an AI request/RAG observability log.
   */
  async create(userId: string, data: {
    requestType: AIRequestType;
    prompt: string;
    retrievedContext?: string;
    response: string;
    latencyMs?: number;
    modelUsed?: string;
    tokenUsage?: number;
    caseId?: string;
  }) {
    if (data.caseId) {
      const c = await prisma.case.findFirst({
        where: { id: data.caseId, userId },
      });
      if (!c) {
        throw new Error("Unauthorized: Case not found or access denied.");
      }
    }

    return prisma.aIRequestLog.create({
      data,
    });
  }
}

export const aiRequestLogRepository = new AIRequestLogRepository();
export default aiRequestLogRepository;

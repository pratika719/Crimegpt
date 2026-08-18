import { prisma } from "@/lib/prisma";
import { AIRequestType } from "@/generated/prisma/client";

export type CreateAIRequestLogInput = {
  caseId?: string;
  userId: string;
  jobId?: string;
  requestType: string;
  modelUsed?: string;
  status: "SUCCESS" | "FAILED";
  latencyMs?: number;
  retrievedChunksCount?: number;
  cacheHit?: boolean;
  failureReason?: string;
};

export class AIRequestLogRepository {
  /**
   * Persists an AI request/RAG observability log.
   * Supports both the new single-argument signature and the legacy signature.
   */
  async create(input: CreateAIRequestLogInput): Promise<any>;
  async create(
    userId: string,
    data: {
      requestType: AIRequestType;
      prompt: string;
      retrievedContext?: string;
      response: string;
      latencyMs?: number;
      modelUsed?: string;
      tokenUsage?: number;
      caseId?: string;
      queueJobId?: string;
    },
    tx?: any
  ): Promise<any>;
  async create(
    firstArg: string | CreateAIRequestLogInput,
    data?: {
      requestType: AIRequestType;
      prompt: string;
      retrievedContext?: string;
      response: string;
      latencyMs?: number;
      modelUsed?: string;
      tokenUsage?: number;
      caseId?: string;
      queueJobId?: string;
    },
    tx?: any
  ): Promise<any> {
    if (typeof firstArg === "string") {
      const userId = firstArg;
      const client = tx || prisma;
      if (data?.caseId) {
        const c = await client.case.findFirst({
          where: { id: data.caseId, userId },
        });
        if (!c) {
          throw new Error("Unauthorized: Case not found or access denied.");
        }
      }

      return client.aIRequestLog.create({
        data: {
          ...data,
          userId,
        },
      });
    } else {
      const input = firstArg;
      const client = prisma;

      const dbStatus = input.status === "SUCCESS" ? "SUCCEEDED" : "FAILED";

      // Map requestType if it is a DocumentType string, otherwise use it directly
      let dbRequestType: any = input.requestType;
      const docTypeMap: Record<string, string> = {
        FIR: "FIR_GENERATION",
        INVESTIGATION_SUMMARY: "INVESTIGATION_SUMMARY",
        CHARGE_SHEET: "CHARGE_SHEET",
        LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
        AI_DIAGNOSTICS: "AI_DIAGNOSTICS_GENERATION",
        REMAND_REQUEST: "REMAND_REQUEST_GENERATION",
        CASE_DIARY: "CASE_DIARY_GENERATION",
      };
      if (docTypeMap[input.requestType]) {
        dbRequestType = docTypeMap[input.requestType];
      }

      return client.aIRequestLog.create({
        data: {
          caseId: input.caseId,
          userId: input.userId,
          queueJobId: input.jobId,
          requestType: dbRequestType,
          modelUsed: input.modelUsed,
          status: dbStatus as any,
          latencyMs: input.latencyMs,
          retrievedChunksCount: input.retrievedChunksCount,
          cacheHit: input.cacheHit ?? false,
          failureReason: input.failureReason,
        },
      });
    }
  }
}

export const aiRequestLogRepository = new AIRequestLogRepository();
export default aiRequestLogRepository;

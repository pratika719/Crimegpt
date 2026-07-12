import { DocumentType, AIRequestType } from "@/generated/prisma/client";
import { documentRepository } from "@/repositories/document.repository";
import { aiRequestLogRepository } from "@/repositories/ai-request-log.repository";
import { CleanedLawReference } from "@/ai/retrievers/law.retriever";

export class DocumentVersionService {
  /**
   * Retrieves the next version number for a document type under a specific case.
   */
  async getNextVersion(caseId: string, userId: string, type: DocumentType): Promise<number> {
    const latestDoc = await documentRepository.findLatestByType(caseId, userId, type);
    return latestDoc ? latestDoc.version + 1 : 1;
  }
}

export class AIObservabilityService {
  /**
   * Records execution telemetry inside AIRequestLog.
   */
  async logRequest(userId: string, data: {
    requestType: AIRequestType;
    prompt: string;
    retrievedContext?: string;
    response: string;
    latencyMs?: number;
    modelUsed?: string;
    tokenUsage?: number;
    caseId?: string;
    queueJobId?: string;
  }, tx?: any) {
    return aiRequestLogRepository.create(userId, data, tx);
  }
}

export class GeneratedDocumentService {
  /**
   * Saves/creates a generated document.
   */
  async saveDocument(userId: string, data: {
    caseId: string;
    type: DocumentType;
    title: string;
    content: any;
    version?: number;
  }, tx?: any) {
    return documentRepository.create(userId, data, tx);
  }
}

export class PromptExecutionHelper {
  /**
   * Helper to format retrieved laws into a standardized string block for prompts.
   */
  formatLawsContext(
    laws: CleanedLawReference[], 
    fallbackText = "No direct law references found in the database. Do NOT cite any IPC/BNS sections. Mark confidence as LOW and explain that no legal references were found."
  ): string {
    return laws.length > 0 
      ? laws.map((law, index) => `
[LAW REFERENCE ${index + 1}]
Source: ${law.source}
Section: ${law.section}
Offense: ${law.offense}
Punishment: ${law.punishment}
Description: ${law.description}
--------------------------------------------------`).join("\n")
      : fallbackText;
  }
}

export const documentVersionService = new DocumentVersionService();
export const aiObservabilityService = new AIObservabilityService();
export const generatedDocumentService = new GeneratedDocumentService();
export const promptExecutionHelper = new PromptExecutionHelper();

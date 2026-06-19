import { DocumentType, AIRequestType } from "@/generated/prisma/client";
import { documentRepository } from "@/repositories/document.repository";
import { aiRequestLogRepository } from "@/repositories/ai-request-log.repository";
import { CleanedLawReference } from "@/ai/retrievers/law.retriever";

export class DocumentVersionService {
  /**
   * Retrieves the next version number for a document type under a specific case.
   */
  async getNextVersion(caseId: string, type: DocumentType): Promise<number> {
    const latestDoc = await documentRepository.findLatestByType(caseId, type);
    return latestDoc ? latestDoc.version + 1 : 1;
  }
}

export class AIObservabilityService {
  /**
   * Records execution telemetry inside AIRequestLog.
   */
  async logRequest(data: {
    requestType: AIRequestType;
    prompt: string;
    retrievedContext?: string;
    response: string;
    latencyMs?: number;
    modelUsed?: string;
    caseId?: string;
  }) {
    return aiRequestLogRepository.create(data);
  }
}

export class GeneratedDocumentService {
  /**
   * Saves/creates a generated document.
   */
  async saveDocument(data: {
    caseId: string;
    type: DocumentType;
    title: string;
    content: any;
    version?: number;
  }) {
    return documentRepository.create(data);
  }
}

export class PromptExecutionHelper {
  /**
   * Helper to format retrieved laws into a standardized string block for prompts.
   */
  formatLawsContext(
    laws: CleanedLawReference[], 
    fallbackText = "No direct law references found in the database. Apply general legal reasoning."
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

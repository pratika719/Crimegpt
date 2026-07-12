import { DocumentType } from "@/generated/prisma/client";
import { documentGenerationRequestService } from "@/services/document-engine/document-generation-request.service";

/**
 * Service orchestrating the retrieval, LLM analysis, incremental versioning, database persistence, 
 * and AI logging for generating First Information Reports (FIR).
 */
export class FIRService {
  /**
   * Generates a First Information Report (FIR) for a case statement, increments the version number,
   * saves the results as a legal document, updates the case status, and logs telemetry.
   * 
   * @param caseId Unique identifier of the case.
   * @param userId Unique identifier of the user.
   * @returns Persisted GeneratedDocument instance.
   */
  async generateFIR(caseId: string, userId: string) {
    return documentGenerationRequestService.requestDocumentGeneration({ caseId, userId, documentType: DocumentType.FIR });
  }
}

export const firService = new FIRService();
export default firService;

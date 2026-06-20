import { DocumentType } from "@/generated/prisma/client";
import { documentGeneratorService } from "@/services/document-engine/document-generator.service";

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
    return documentGeneratorService.generateDocument(caseId, userId, DocumentType.FIR);
  }
}

export const firService = new FIRService();
export default firService;

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
   * @returns Persisted GeneratedDocument instance.
   */
  async generateFIR(caseId: string) {
    return documentGeneratorService.generateDocument(caseId, DocumentType.FIR);
  }
}

export const firService = new FIRService();
export default firService;

import { DocumentType } from "@/generated/prisma/client";
import { documentGeneratorService } from "@/services/document-engine/document-generator.service";

/**
 * Service coordinating Case, CaseMetadata, PGVector similarity search, Gemini, and DB log/document updates.
 */
export class InvestigationSummaryService {
  /**
   * Generates an Investigation Summary for a case profile, increments version number,
   * persists the document, logs AI request logs, and updates case status.
   * 
   * @param caseId Case profile ID.
   * @returns Persisted GeneratedDocument instance.
   */
  async generateSummary(caseId: string) {
    return documentGeneratorService.generateDocument(caseId, DocumentType.INVESTIGATION_SUMMARY);
  }
}

export const investigationSummaryService = new InvestigationSummaryService();
export default investigationSummaryService;

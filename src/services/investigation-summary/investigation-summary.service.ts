import { DocumentType } from "@/generated/prisma/client";
import { documentGenerationRequestService } from "@/services/document-engine/document-generation-request.service";

/**
 * Service coordinating Case, CaseMetadata, PGVector similarity search, Gemini, and DB log/document updates.
 */
export class InvestigationSummaryService {
  /**
   * Generates an Investigation Summary for a case profile, increments version number,
   * persists the document, logs AI request logs, and updates case status.
   * 
   * @param caseId Case profile ID.
   * @param userId Unique identifier of the user.
   * @returns Persisted GeneratedDocument instance.
   */
  async generateSummary(caseId: string, userId: string) {
    return documentGenerationRequestService.requestDocumentGeneration({ caseId, userId, documentType: DocumentType.INVESTIGATION_SUMMARY });
  }
}

export const investigationSummaryService = new InvestigationSummaryService();
export default investigationSummaryService;

import { CaseRepository } from "@/repositories/case.repository";
import { documentRepository } from "@/repositories/document.repository";
import { legalAnalysisChain } from "@/ai/chains/legal-analysis.chain";
import { DocumentType, AIRequestType } from "@/generated/prisma/client";
import { generatedDocumentService, aiObservabilityService } from "@/services/shared/ai-shared.service";
import { activityService } from "@/services/activity/activity.service";
import { unifiedContextService } from "@/services/case/unified-context.service";

/**
 * Service orchestrating the retrieval, LLM analysis, database persistence, and observability log generation.
 */
export class LegalAnalysisService {
  private caseRepository = new CaseRepository();
  private documentRepository = documentRepository;

  /**
   * Runs legal analysis on a case statement, saves the results as a legal document,
   * updates the case status, and logs telemetry.
   * 
   * @param caseId Unique identifier of the case.
   * @returns Persisted GeneratedDocument instance.
   */
  async analyzeCase(caseId: string) {
    console.log(`💼 [LegalAnalysisService] Fetching case narrative for ID: ${caseId}`);
    
    // 1. Fetch case details
    const caseItem = await this.caseRepository.findById(caseId);
    if (!caseItem) {
      throw new Error(`Case not found for ID: ${caseId}`);
    }

    // 2. Execute the RAG Chain with Unified Case Context
    console.log(`💼 [LegalAnalysisService] Building unified case context...`);
    const context = await unifiedContextService.buildUnifiedCaseContext(caseId);

    console.log(`💼 [LegalAnalysisService] Launching AI legal analysis chain...`);
    const chainOutput = await legalAnalysisChain.execute(context);

    // 3. Delete any previous AI Legal Analysis documents for this case (supports regeneration)
    console.log(`💼 [LegalAnalysisService] Cleaning up old analysis records...`);
    await this.documentRepository.deleteManyByType(caseId, DocumentType.LEGAL_ANALYSIS);

    // 4. Save results to GeneratedDocument table using shared service
    console.log(`💼 [LegalAnalysisService] Storing legal analysis document...`);
    const document = await generatedDocumentService.saveDocument({
      caseId,
      type: DocumentType.LEGAL_ANALYSIS,
      title: `AI Legal Analysis: ${caseItem.title}`,
      content: chainOutput.result, // Zod-validated structured JSON
    });

    // 5. Store telemetry and RAG observability in AIRequestLog table using shared service
    console.log(`💼 [LegalAnalysisService] Storing AI request logs for observability...`);
    await aiObservabilityService.logRequest({
      requestType: AIRequestType.LEGAL_ANALYSIS,
      prompt: chainOutput.promptText,
      retrievedContext: JSON.stringify(chainOutput.retrievedChunks),
      response: chainOutput.rawResponse,
      latencyMs: chainOutput.latencyMs,     
      modelUsed: chainOutput.modelUsed,
      caseId,
    });

    // Log Document Generated Activity
    await activityService.logDocumentGenerated(caseId, DocumentType.LEGAL_ANALYSIS, document.title);

    // 6. Automatically transition Case status from OPEN to UNDER_INVESTIGATION
    if (caseItem.status === "OPEN") {
      console.log(`💼 [LegalAnalysisService] Upgrading case status to UNDER_INVESTIGATION...`);
      await this.caseRepository.updateStatus(caseId, "UNDER_INVESTIGATION");
    }

    console.log(`💼 [LegalAnalysisService] Case analysis complete.`);
    return document;
  }
}

export const legalAnalysisService = new LegalAnalysisService();
export default legalAnalysisService;

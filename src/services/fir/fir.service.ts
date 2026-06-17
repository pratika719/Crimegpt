import { CaseRepository } from "@/repositories/case.repository";
import { documentRepository } from "@/repositories/document.repository";
import { aiRequestLogRepository } from "@/repositories/ai-request-log.repository";
import { firGenerationChain } from "@/ai/chains/fir-generation.chain";
import { DocumentType, AIRequestType } from "@/generated/prisma/client";

/**
 * Service orchestrating the retrieval, LLM analysis, incremental versioning, database persistence, 
 * and AI logging for generating First Information Reports (FIR).
 */
export class FIRService {
  private caseRepository = new CaseRepository();
  private documentRepository = documentRepository;
  private aiRequestLogRepository = aiRequestLogRepository;

  /**
   * Generates a First Information Report (FIR) for a case statement, increments the version number,
   * saves the results as a legal document, updates the case status, and logs telemetry.
   * 
   * @param caseId Unique identifier of the case.
   * @returns Persisted GeneratedDocument instance.
   */
  async generateFIR(caseId: string) {
    console.log(`💼 [FIRService] Fetching case narrative for ID: ${caseId}`);
    
    // 1. Fetch case details
    const caseItem = await this.caseRepository.findById(caseId);
    if (!caseItem) {
      throw new Error(`Case not found for ID: ${caseId}`);
    }

    // 2. Fetch the latest FIR for this case to calculate the next version number
    const latestDoc = await this.documentRepository.findLatestByType(caseId, DocumentType.FIR);
    const nextVersion = latestDoc ? latestDoc.version + 1 : 1;
    console.log(`💼 [FIRService] Next FIR version will be: v${nextVersion}`);

    // 3. Execute the RAG Chain
    console.log(`💼 [FIRService] Launching AI FIR generation chain...`);
    const chainOutput = await firGenerationChain.execute(caseItem.narrative);

    // 4. Save results to GeneratedDocument table with version number
    console.log(`💼 [FIRService] Storing FIR document v${nextVersion}...`);
    const document = await this.documentRepository.create({
      caseId,
      type: DocumentType.FIR,
      title: `First Information Report (FIR) - v${nextVersion}`,
      content: chainOutput.result, // Zod-validated structured JSON
      version: nextVersion,
    });

    // 5. Store telemetry and RAG observability in AIRequestLog table
    console.log(`💼 [FIRService] Storing AI request logs for observability...`);
    await this.aiRequestLogRepository.create({
      requestType: AIRequestType.FIR_GENERATION,
      prompt: chainOutput.promptText,
      retrievedContext: JSON.stringify(chainOutput.retrievedChunks),
      response: chainOutput.rawResponse,
      latencyMs: chainOutput.latencyMs,     
      modelUsed: chainOutput.modelUsed,
      caseId,
    });

    // 6. Automatically transition Case status from OPEN to UNDER_INVESTIGATION
    if (caseItem.status === "OPEN") {
      console.log(`💼 [FIRService] Upgrading case status to UNDER_INVESTIGATION...`);
      await this.caseRepository.updateStatus(caseId, "UNDER_INVESTIGATION");
    }

    console.log(`💼 [FIRService] FIR generation complete.`);
    return document;
  }
}

export const firService = new FIRService();
export default firService;

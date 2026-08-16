import { CaseRepository } from "@/repositories/case.repository";
import { legalAnalysisChain } from "@/ai/chains/legal-analysis.chain";
import { DocumentType, AIRequestType } from "@/generated/prisma/client";
import { generatedDocumentService, aiObservabilityService } from "@/services/shared/ai-shared.service";
import { activityService } from "@/services/activity/activity.service";
import { unifiedContextService } from "@/services/case/unified-context.service";
import { prisma } from "@/lib/prisma";
import { withRedisLock } from "@/lib/redis/redis-lock";
import { logger } from "@/lib/logger";

/**
 * Service orchestrating the retrieval, LLM analysis, database persistence, and observability log generation.
 */
export class LegalAnalysisService {
  private caseRepository = new CaseRepository();

  /**
   * Runs legal analysis on a case statement, saves the results as a legal document,
   * updates the case status, and logs telemetry.
   * 
   * @param caseId Unique identifier of the case.
   * @param userId Unique identifier of the user.
   * @returns Persisted GeneratedDocument instance.
   */
  async analyzeCase(caseId: string, userId: string) {
    return withRedisLock(`lock:legal-analysis:${caseId}`, 120_000, async () => {
      logger.info({ caseId, userId }, "Legal analysis started");

      // 1. Fetch case details
      const caseItem = await this.caseRepository.findById(caseId, userId);
      if (!caseItem) {
        throw new Error(`Case not found for ID: ${caseId}`);
      }

      // 2. Execute the RAG Chain with Unified Case Context
      logger.info({ caseId, userId }, "Building unified case context for legal analysis");
      const context = await unifiedContextService.buildUnifiedCaseContext(caseId, userId);

      logger.info({ caseId, userId }, "Launching AI legal analysis chain");
      const chainOutput = await legalAnalysisChain.execute(context);

      // 3. Execute all DB writes atomically inside a single transaction
      const document = await prisma.$transaction(async (tx) => {
        // a. Pessimistic lock on the Case row to serialize concurrent writes
        await tx.$executeRaw`SELECT id FROM "Case" WHERE id = ${caseId} FOR UPDATE`;

        // b. Compute next version from existing docs
        const existingDocs = await tx.generatedDocument.findMany({
          where: { caseId, type: DocumentType.LEGAL_ANALYSIS },
        });
        const nextVer = existingDocs.length > 0
          ? Math.max(...existingDocs.map((d: any) => d.version)) + 1
          : 1;

        // c. Delete all previous legal analysis docs (keep table clean)
        if (existingDocs.length > 0) {
          await tx.generatedDocument.deleteMany({
            where: { caseId, type: DocumentType.LEGAL_ANALYSIS },
          });
        }

        // d. Save new document with incremented version
        const doc = await generatedDocumentService.saveDocument(userId, {
          caseId,
          type: DocumentType.LEGAL_ANALYSIS,
          title: `AI Legal Analysis: ${caseItem.title} - v${nextVer}`,
          content: chainOutput.result,
          version: nextVer,
        }, tx);

        // e. Store telemetry in AIRequestLog
        await aiObservabilityService.logRequest(userId, {
          requestType: AIRequestType.LEGAL_ANALYSIS,
          prompt: chainOutput.promptText,
          retrievedContext: JSON.stringify(chainOutput.retrievedChunks),
          response: chainOutput.rawResponse,
          latencyMs: chainOutput.latencyMs,
          modelUsed: chainOutput.modelUsed,
          caseId,
        }, tx);

        // f. Log activity
        await activityService.logDocumentGenerated(caseId, userId, DocumentType.LEGAL_ANALYSIS, doc.title, nextVer, tx);

        // g. Transition case status from OPEN to UNDER_INVESTIGATION
        if (caseItem.status === "OPEN") {
          await this.caseRepository.updateStatus(caseId, userId, "UNDER_INVESTIGATION", tx);
        }

        return doc;
      }, {
        maxWait: 20000,
        timeout: 40000,
      });

      logger.info({ caseId, userId, version: document.version }, "Legal analysis complete");
      return document;
    });
  }
}

export const legalAnalysisService = new LegalAnalysisService();
export default legalAnalysisService;

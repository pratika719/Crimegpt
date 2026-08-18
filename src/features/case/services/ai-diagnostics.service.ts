import { CaseRepository } from "@/features/case/repositories/case.repository";
import { aiDiagnosticsChain } from "@/ai/chains/ai-diagnostics.chain";
import { AIRequestType } from "@/generated/prisma/client";
import { aiObservabilityService } from "@/services/shared/ai-shared.service";
import { unifiedContextService } from "@/features/case/services/unified-context.service";
import { logger } from "@/lib/logger";

export class AIDiagnosticsService {
  private caseRepository = new CaseRepository();

  async runDiagnostics(caseId: string, userId: string) {
    logger.info({ caseId, userId }, "[AIDiagnosticsService] Fetching full case data");
    
    try {
      // 1. Fetch comprehensive case details
      const caseItem = await this.caseRepository.findById(caseId, userId);
      if (!caseItem) {
        throw new Error(`Case record not found for ID: ${caseId}`);
      }

      // 2. Execute the Diagnostics Chain with Unified Case Context
      logger.info({ caseId }, "[AIDiagnosticsService] Building unified case context");
      const context = await unifiedContextService.buildUnifiedCaseContext(caseId, userId);

      logger.info({ caseId }, "[AIDiagnosticsService] Launching AI Diagnostics chain");
      const chainOutput = await aiDiagnosticsChain.execute(context);

      // 3. Log observability (Telemetry for the LLM request)
      logger.info({ caseId }, "[AIDiagnosticsService] Storing AI request logs");
      try {
        await aiObservabilityService.logRequest(userId, {
          requestType: AIRequestType.AI_DIAGNOSTICS_GENERATION,
          prompt: chainOutput.promptText,
          retrievedContext: JSON.stringify(chainOutput.retrievedChunks),
          response: chainOutput.rawResponse,
          latencyMs: chainOutput.latencyMs,     
          modelUsed: chainOutput.modelUsed,
          caseId,
        });
      } catch (obsError) {
        // We don't throw or return early here because telemetry failure shouldn't abort the run
        logger.warn({ err: obsError }, "[AIDiagnosticsService] Failed to write AI observability log");
      }

      logger.info({ caseId }, "[AIDiagnosticsService] Case diagnostics complete");
      return chainOutput.result;
    } catch (err: any) {
      logger.error({ caseId, err }, "[AIDiagnosticsService] Diagnostics run failed");

      if (err?.name === "AITimeoutError" || err?.message?.includes("timed out")) {
        throw new Error("AI Diagnostics service timed out. Please try again.");
      }
      if (err?.statusCode === 503 || err?.message?.includes("503") || err?.message?.includes("high demand")) {
        throw new Error("AI engine is currently under heavy load. Please try again shortly.");
      }
      if (err?.message?.includes("API key") || err?.message?.includes("401") || err?.message?.includes("403")) {
        throw new Error("AI Provider authorization error. Please check system API credentials.");
      }
      throw err;
    }
  }
}

export const aiDiagnosticsService = new AIDiagnosticsService();
export default aiDiagnosticsService;

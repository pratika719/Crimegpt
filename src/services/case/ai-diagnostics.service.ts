import { CaseRepository } from "@/repositories/case.repository";
import { aiDiagnosticsChain } from "@/ai/chains/ai-diagnostics.chain";
import { AIRequestType } from "@/generated/prisma/client";
import { aiObservabilityService } from "@/services/ai/ai-observability.service";
import { unifiedContextService } from "@/services/case/unified-context.service";

export class AIDiagnosticsService {
  private caseRepository = new CaseRepository();

  async runDiagnostics(caseId: string, userId: string) {
    console.log(`🧠 [AIDiagnosticsService] Fetching full case data for ID: ${caseId} by user: ${userId}`);
    
    // 1. Fetch comprehensive case details
    const caseItem = await this.caseRepository.findById(caseId, userId);
    if (!caseItem) {
      throw new Error(`Case not found for ID: ${caseId}`);
    }

    // 2. Execute the Diagnostics Chain with Unified Case Context
    console.log(`🧠 [AIDiagnosticsService] Building unified case context...`);
    const context = await unifiedContextService.buildUnifiedCaseContext(caseId, userId);

    console.log(`🧠 [AIDiagnosticsService] Launching AI Diagnostics chain...`);
    const chainOutput = await aiDiagnosticsChain.execute(context);

    // 3. Log observability (Telemetry for the LLM request)
    console.log(`🧠 [AIDiagnosticsService] Storing AI request logs...`);
    try {
      await aiObservabilityService.logSuccess({
        caseId,
        userId,
        requestType: "AI_DIAGNOSTICS",
        modelUsed: chainOutput.modelUsed,
        latencyMs: chainOutput.latencyMs,
        retrievedChunksCount: chainOutput.retrievedChunks.length,
      });
    } catch (obsError) {
      // We don't throw or return early here because telemetry failure shouldn't abort the run
      console.warn(`⚠️ Warning: Failed to write AI observability log:`, obsError);
    }

    console.log(`🧠 [AIDiagnosticsService] Case diagnostics complete.`);
    return chainOutput.result;
  }
}

export const aiDiagnosticsService = new AIDiagnosticsService();
export default aiDiagnosticsService;

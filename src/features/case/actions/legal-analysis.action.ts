"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { requireUser, validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess } from "@/lib/action-response";

const AnalyzeCaseSchema = z.string().min(1, "Case ID is required");

/**
 * Server action to trigger AI legal analysis for a case.
 */
export async function analyzeCaseAction(caseId: string) {
  return validateActionInput(
    AnalyzeCaseSchema,
    caseId,
    async (validatedCaseId) => {
      const userId = await requireUser();

      const { legalAnalysisService } = await import("@/features/case/services/legal-analysis.service");
      await legalAnalysisService.analyzeCase(validatedCaseId, userId);

      // Invalidate the Redis case detail cache so the next load gets fresh data
      try {
        const { cacheInvalidationService } = await import("@/services/cache/cache-invalidation.service");
        await cacheInvalidationService.invalidateCaseMutation({ userId, caseId: validatedCaseId });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on legal analysis`);
      }

      // Revalidate the case detail page so the UI displays the generated analysis document and new status
      revalidatePath(`/case/${validatedCaseId}`);

      return actionSuccess();
    }
  );
}

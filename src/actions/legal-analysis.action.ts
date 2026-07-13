"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";

const AnalyzeCaseSchema = z.string().min(1, "Case ID is required");

/**
 * Server action to trigger AI legal analysis for a case.
 */
export async function analyzeCaseAction(caseId: string) {
  return validateActionInput(
    AnalyzeCaseSchema,
    caseId,
    async (validatedCaseId) => {
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const { legalAnalysisService } = await import("@/services/case/legal-analysis.services");
      await legalAnalysisService.analyzeCase(validatedCaseId, userId);

      // Invalidate the Redis case detail cache so the next load gets fresh data
      try {
        const { cacheInvalidationService } = await import("@/services/cache/cache-invalidation.service");
        await cacheInvalidationService.invalidateCaseMutation({ userId, caseId: validatedCaseId });
      } catch (err) {
        console.warn(`[Cache Invalidation Warning] Failed to invalidate cache on legal analysis:`, err);
      }

      // Revalidate the case detail page so the UI displays the generated analysis document and new status
      revalidatePath(`/case/${validatedCaseId}`);

      return actionSuccess();
    }
  );
}

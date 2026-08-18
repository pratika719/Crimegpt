"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { investigationSummaryService } from "@/features/case/services/investigation-summary.service";
import { requireUser, validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess } from "@/lib/action-response";

const GenerateSummarySchema = z.string().min(1, "Case ID is required");

/**
 * Server action to generate an Investigation Summary document for a case using RAG.
 */
export async function generateInvestigationSummaryAction(caseId: string) {
  return validateActionInput(
    GenerateSummarySchema,
    caseId,
    async (validatedCaseId) => {
      const userId = await requireUser();

      await investigationSummaryService.generateSummary(validatedCaseId, userId);

      // Revalidate the case detail page so the UI updates
      revalidatePath(`/case/${validatedCaseId}`);

      return actionSuccess();
    }
  );
}

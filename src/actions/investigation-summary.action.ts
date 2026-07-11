"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { investigationSummaryService } from "@/services/investigation-summary/investigation-summary.service";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";

const GenerateSummarySchema = z.string().min(1, "Case ID is required");

/**
 * Server action to generate an Investigation Summary document for a case using RAG.
 */
export async function generateInvestigationSummaryAction(caseId: string) {
  return validateActionInput(
    GenerateSummarySchema,
    caseId,
    async (validatedCaseId) => {
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      await investigationSummaryService.generateSummary(validatedCaseId, userId);

      // Revalidate the case detail page so the UI updates
      revalidatePath(`/case/${validatedCaseId}`);

      return actionSuccess();
    }
  );
}

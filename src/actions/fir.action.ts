"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firService } from "@/services/fir/fir.service";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";

const GenerateFIRSchema = z.string().min(1, "Case ID is required");

/**
 * Server action to generate an FIR document for a case using RAG.
 */
export async function generateFIRAction(caseId: string) {
  return validateActionInput(
    GenerateFIRSchema,
    caseId,
    async (validatedCaseId) => {
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      await firService.generateFIR(validatedCaseId, userId);

      // Revalidate the case detail page so the UI displays the new FIR document and updated status
      revalidatePath(`/case/${validatedCaseId}`);

      return actionSuccess();
    }
  );
}

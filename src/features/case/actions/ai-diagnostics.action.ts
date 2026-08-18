"use server";

import { z } from "zod";
import { aiDiagnosticsService } from "@/features/case/services/ai-diagnostics.service";
import { requireUser, validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess } from "@/lib/action-response";

const RunDiagnosticsSchema = z.string().min(1, "Case ID is required");

/**
 * Server action to trigger AI diagnostics for a case.
 */
export async function runAIDiagnosticsAction(caseId: string) {
  return validateActionInput(
    RunDiagnosticsSchema,
    caseId,
    async (validatedCaseId) => {
      const userId = await requireUser();

      const result = await aiDiagnosticsService.runDiagnostics(validatedCaseId, userId);

      return actionSuccess({
        data: result,
      });
    }
  );
}

"use server";

import { auth } from "@/auth";
import { aiDiagnosticsService } from "@/services/case/ai-diagnostics.service";

/**
 * Server action to trigger AI diagnostics for a case.
 */
export async function runAIDiagnosticsAction(caseId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!caseId) {
      return {
        success: false,
        message: "Case ID is required.",
      };
    }

    const result = await aiDiagnosticsService.runDiagnostics(caseId, userId);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("❌ Action Failure (runAIDiagnosticsAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to run diagnostics. Please try again.",
    };
  }
}

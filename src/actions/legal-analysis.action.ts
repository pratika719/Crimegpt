"use server";

import { revalidatePath } from "next/cache";
import { legalAnalysisService } from "@/services/case/legal-analysis.services";
import { auth } from "@/auth";

/**
 * Server action to trigger AI legal analysis for a case.
 * 
 * @param caseId Unique ID of the case.
 * @returns Success status and optional error message.
 */
export async function analyzeCaseAction(caseId: string) {
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

    await legalAnalysisService.analyzeCase(caseId, userId);

    // Revalidate the case detail page so the UI displays the generated analysis document and new status
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("❌ Action Failure (analyzeCaseAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to analyze case. Please try again.",
    };
  }
}

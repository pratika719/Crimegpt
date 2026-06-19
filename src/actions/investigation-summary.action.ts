"use server";

import { revalidatePath } from "next/cache";
import { investigationSummaryService } from "@/services/investigation-summary/investigation-summary.service";

/**
 * Server action to generate an Investigation Summary document for a case using RAG.
 * 
 * @param caseId Unique ID of the case.
 * @returns Success status and optional error message.
 */
export async function generateInvestigationSummaryAction(caseId: string) {
  try {
    if (!caseId) {
      return {
        success: false,
        message: "Case ID is required.",
      };
    }

    await investigationSummaryService.generateSummary(caseId);

    // Revalidate the case detail page so the UI updates
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("❌ Action Failure (generateInvestigationSummaryAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to generate Investigation Summary. Please try again.",
    };
  }
}

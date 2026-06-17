"use server";

import { revalidatePath } from "next/cache";
import { firService } from "@/services/fir/fir.service";

/**
 * Server action to generate an FIR document for a case using RAG.
 * 
 * @param caseId Unique ID of the case.
 * @returns Success status and optional error message.
 */
export async function generateFIRAction(caseId: string) {
  try {
    if (!caseId) {
      return {
        success: false,
        message: "Case ID is required.",
      };
    }

    await firService.generateFIR(caseId);

    // Revalidate the case detail page so the UI displays the new FIR document and updated status
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("❌ Action Failure (generateFIRAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to generate FIR. Please try again.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { caseMetadataService } from "@/services/case-metadata/case-metadata.service";
import { CreateCaseMetadataInput } from "@/schema/case-metadata.schema";

/**
 * Server action to save or update (upsert) investigation metadata for a case.
 */
export async function saveCaseMetadataAction(
  caseId: string,
  data: Omit<CreateCaseMetadataInput, "caseId">
) {
  try {
    if (!caseId) {
      return {
        success: false,
        message: "Case ID is required.",
      };
    }

    const metadata = await caseMetadataService.upsertMetadata(caseId, data);

    // Revalidate the case detail page so the UI displays the new metadata
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(metadata)), // Serialize date fields for Next.js client
    };
  } catch (error: any) {
    console.error("❌ Action Failure (saveCaseMetadataAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to save case metadata.",
    };
  }
}

/**
 * Server action to retrieve case metadata.
 */
export async function getCaseMetadataAction(caseId: string) {
  try {
    if (!caseId) {
      return {
        success: false,
        message: "Case ID is required.",
      };
    }

    const metadata = await caseMetadataService.getMetadata(caseId);

    return {
      success: true,
      data: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    };
  } catch (error: any) {
    console.error("❌ Action Failure (getCaseMetadataAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to fetch case metadata.",
    };
  }
}

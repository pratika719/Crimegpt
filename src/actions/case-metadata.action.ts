"use server";

import { revalidatePath } from "next/cache";
import { caseMetadataService } from "@/services/case-metadata/case-metadata.service";
import { CreateCaseMetadataInput } from "@/schema/case-metadata.schema";
import { auth } from "@/auth";

/**
 * Server action to save or update (upsert) investigation metadata for a case.
 */
export async function saveCaseMetadataAction(
  caseId: string,
  data: Omit<CreateCaseMetadataInput, "caseId">
) {
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

    const metadata = await caseMetadataService.upsertMetadata(caseId, userId, data);

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

    const metadata = await caseMetadataService.getMetadata(caseId, userId);

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

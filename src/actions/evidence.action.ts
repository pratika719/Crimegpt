"use server";

import { revalidatePath } from "next/cache";
import { evidenceService } from "@/services/evidence/evidence.service";
import { CreateEvidenceInput, UpdateEvidenceInput } from "@/schema/evidence.schema";

/**
 * Server action to register a new evidence item to a case.
 */
export async function createEvidenceAction(
  caseId: string,
  data: Omit<CreateEvidenceInput, "caseId">
) {
  try {
    if (!caseId) {
      return { success: false, message: "Case ID is required." };
    }

    const evidence = await evidenceService.createEvidence(caseId, data);
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(evidence)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (createEvidenceAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to register evidence.",
    };
  }
}

/**
 * Server action to update an existing evidence item.
 */
export async function updateEvidenceAction(
  id: string,
  caseId: string,
  data: UpdateEvidenceInput
) {
  try {
    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const evidence = await evidenceService.updateEvidence(id, data);
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(evidence)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (updateEvidenceAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to update evidence details.",
    };
  }
}

/**
 * Server action to remove an evidence item.
 */
export async function deleteEvidenceAction(id: string, caseId: string) {
  try {
    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const evidence = await evidenceService.deleteEvidence(id);
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(evidence)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (deleteEvidenceAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to delete evidence record.",
    };
  }
}

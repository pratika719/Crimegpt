"use server";

import { revalidatePath } from "next/cache";
import { checklistService } from "@/services/checklist/checklist.service";

/**
 * Server action to create a new checklist item under a case.
 */
export async function createChecklistItemAction(caseId: string, title: string) {
  try {
    if (!caseId) {
      return { success: false, message: "Case ID is required." };
    }
    if (!title || !title.trim()) {
      return { success: false, message: "Task title is required." };
    }

    const item = await checklistService.createChecklistItem(caseId, { title: title.trim() });
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(item)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (createChecklistItemAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to create checklist item.",
    };
  }
}

/**
 * Server action to toggle completion status of a checklist item.
 */
export async function toggleChecklistItemAction(id: string, caseId: string, completed: boolean) {
  try {
    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const item = await checklistService.updateChecklistItem(id, { completed });
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(item)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (toggleChecklistItemAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to toggle checklist item.",
    };
  }
}

/**
 * Server action to delete a checklist item.
 */
export async function deleteChecklistItemAction(id: string, caseId: string) {
  try {
    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const item = await checklistService.deleteChecklistItem(id);
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(item)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (deleteChecklistItemAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to delete checklist item.",
    };
  }
}

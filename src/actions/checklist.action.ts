"use server";

import { revalidatePath } from "next/cache";
import { checklistService } from "@/services/checklist/checklist.service";
import { auth } from "@/auth";

/**
 * Server action to create a new checklist item under a case.
 */
export async function createChecklistItemAction(caseId: string, title: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!caseId) {
      return { success: false, message: "Case ID is required." };
    }
    if (!title || !title.trim()) {
      return { success: false, message: "Task title is required." };
    }

    const item = await checklistService.createChecklistItem(caseId, userId, { title: title.trim() });
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
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const item = await checklistService.updateChecklistItem(id, userId, { completed }, caseId);
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
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const item = await checklistService.deleteChecklistItem(id, userId, caseId);
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

/**
 * Server action to rename a checklist item's title.
 */
export async function renameChecklistItemAction(id: string, caseId: string, title: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }
    if (!title || !title.trim()) {
      return { success: false, message: "Task title is required." };
    }

    const item = await checklistService.updateChecklistItem(id, userId, { title: title.trim() }, caseId);
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(item)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (renameChecklistItemAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to rename checklist item.",
    };
  }
}

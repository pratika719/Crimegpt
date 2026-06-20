"use server";

import { revalidatePath } from "next/cache";
import { documentService } from "@/services/document-engine/document.service";
import { auth } from "@/auth";

/**
 * Server action to rename a generated document.
 */
export async function renameDocumentAction(id: string, caseId: string, title: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!id || !caseId) {
      return { success: false, message: "Document ID and Case ID are required." };
    }
    if (!title || !title.trim()) {
      return { success: false, message: "Document title is required." };
    }

    const doc = await documentService.renameDocument(id, userId, title, caseId);
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(doc)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (renameDocumentAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to rename document.",
    };
  }
}

/**
 * Server action to delete a single generated document.
 */
export async function deleteDocumentAction(id: string, caseId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!id || !caseId) {
      return { success: false, message: "Document ID and Case ID are required." };
    }

    await documentService.deleteDocument(id, userId, caseId);
    revalidatePath(`/case/${caseId}`);

    return { success: true };
  } catch (error: any) {
    console.error("❌ Action Failure (deleteDocumentAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to delete document.",
    };
  }
}

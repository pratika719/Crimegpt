"use server";

import { revalidatePath } from "next/cache";
import { DocumentType } from "@/generated/prisma/client";
import { documentGeneratorService } from "@/services/document-engine/document-generator.service";
import { activityService } from "@/services/activity/activity.service";

/**
 * Server action to generate (or regenerate) any registered document type for a case.
 * 
 * @param caseId Unique ID of the case.
 * @param type The DocumentType to generate.
 * @param isRegenerate Whether this is a regeneration of an existing document.
 * @returns Success status, document details, and optional error message.
 */
export async function generateDocumentAction(caseId: string, type: string, isRegenerate = false) {
  try {
    if (!caseId) {
      return { success: false, message: "Case ID is required." };
    }
    if (!type) {
      return { success: false, message: "Document Type is required." };
    }

    const docType = type as DocumentType;
    const document = await documentGeneratorService.generateDocument(caseId, docType);

    // If it's a regeneration, also log a specific activity entry
    if (isRegenerate) {
      await activityService.logDocumentRegenerated(caseId, docType, document.title, document.version);
    }

    // Revalidate the case detail page so the UI displays the new document
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      documentId: document.id,
      version: document.version,
    };
  } catch (error: any) {
    console.error(`❌ Action Failure (generateDocumentAction - ${type}):`, error);
    return {
      success: false,
      message: error?.message || `Failed to generate ${type}. Please try again.`,
    };
  }
}

/**
 * Server action to log document related activities (e.g. PDF downloads).
 */
export async function logDocumentActivityAction(
  caseId: string, 
  actionType: "DOWNLOAD" | "REGENERATE", 
  docType: string, 
  docTitle: string, 
  version: number
) {
  try {
    if (actionType === "DOWNLOAD") {
      await activityService.logDocumentDownloaded(caseId, docType, docTitle, version);
    } else if (actionType === "REGENERATE") {
      await activityService.logDocumentRegenerated(caseId, docType, docTitle, version);
    }
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Action Failure (logDocumentActivityAction):", error);
    return { success: false, message: error?.message };
  }
}

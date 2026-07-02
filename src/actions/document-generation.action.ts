"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DocumentType } from "@/generated/prisma/client";
import { activityService } from "@/services/activity/activity.service";
import { CaseService } from "@/services/case/case.services";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";

const GenerateDocumentSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  type: z.string().min(1, "Document Type is required"),
  isRegenerate: z.boolean().optional().default(false),
});

const LogDocumentActivitySchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  actionType: z.enum(["DOWNLOAD", "REGENERATE"]),
  docType: z.string().min(1, "Document Type is required"),
  docTitle: z.string().min(1, "Document Title is required"),
  version: z.number().int().min(1),
});

/**
 * Server action to generate (or regenerate) any registered document type for a case.
 */
export async function generateDocumentAction(caseId: string, type: string, isRegenerate = false) {
  return validateActionInput(
    GenerateDocumentSchema,
    { caseId, type, isRegenerate },
    async (validated) => {
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const docType = validated.type as DocumentType;
      const { documentGeneratorService } = await import("@/services/document-engine/document-generator.service");
      const document = await documentGeneratorService.generateDocument(validated.caseId, userId, docType);

      // If it's a regeneration, also log a specific activity entry
      if (validated.isRegenerate) {
        await activityService.logDocumentRegenerated(validated.caseId, userId, docType, document.title, document.version);
      }

      // Revalidate the case detail page so the UI displays the new document
      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        documentId: document.id,
        version: document.version,
      });
    }
  );
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
  return validateActionInput(
    LogDocumentActivitySchema,
    { caseId, actionType, docType, docTitle, version },
    async (validated) => {
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const caseService = new CaseService();
      try {
        await caseService.getCaseById(validated.caseId, userId);
      } catch {
        return actionFailure("UNAUTHORIZED", "Unauthorized or case not found");
      }

      if (validated.actionType === "DOWNLOAD") {
        await activityService.logDocumentDownloaded(validated.caseId, userId, validated.docType, validated.docTitle, validated.version);
      } else if (validated.actionType === "REGENERATE") {
        await activityService.logDocumentRegenerated(validated.caseId, userId, validated.docType, validated.docTitle, validated.version);
      }
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DocumentType } from "@/generated/prisma/client";
import { activityService } from "@/services/activity/activity.service";
import { CaseService } from "@/services/case/case.services";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";
import { queueProducerService } from "@/services/queue/queue-producer.service";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";

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
const enqueueDocumentGenerationSchema = z.object({
  caseId: z.string().cuid(),
  documentType: z.nativeEnum(DocumentType),
  forceRegenerate: z.boolean().default(false),
});

export async function generateDocumentAction(input: unknown) {
  return validateActionInput(
    enqueueDocumentGenerationSchema,
    input,
    async (data) => {
      const session = await auth();

      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }

      const queued = await queueProducerService.addDocumentGenerationJob({
        caseId: data.caseId,
        userId: session.user.id,
        documentType: data.documentType,
        forceRegenerate: data.forceRegenerate,
      });

      console.log("[document-generation-action] queued", queued);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId: session.user.id,
          caseId: data.caseId,
        });
      } catch (err) {
        console.warn(`[Cache Invalidation Warning] Failed to invalidate cache on document enqueue for case ${data.caseId}:`, err);
      }

      revalidatePath(`/case/${data.caseId}`);

      return actionSuccess({
        data: {
          message: "Document generation started.",
          ...queued,
        },
      });
    },
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

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        console.warn(`[Cache Invalidation Warning] Failed to invalidate cache on document activity log for case ${validated.caseId}:`, err);
      }

      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

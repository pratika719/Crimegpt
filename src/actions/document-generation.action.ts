"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DocumentType } from "@/generated/prisma/client";
import { activityService } from "@/services/activity/activity.service";
import { CaseService } from "@/services/case/case.services";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";
import { logger } from "@/lib/logger";
import { documentGenerationRequestService } from "@/services/document-engine/document-generation-request.service";
import { AppError } from "@/lib/error/app-error";
import { classifyAIError } from "@/lib/error/ai-error-classifier";

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

      logger.info(
        {
          caseId: data.caseId,
          userId: session.user.id,
          documentType: data.documentType,
          forceRegenerate: data.forceRegenerate,
        },
        "Document generation requested",
      );

      try {
        const result =
          await documentGenerationRequestService.requestDocumentGeneration({
          caseId: data.caseId,
          userId: session.user.id,
          documentType: data.documentType,
          forceRegenerate: data.forceRegenerate,
        });

        logger.info(
          {
            jobId: "jobId" in result ? result.jobId : undefined,
            documentId: "documentId" in result ? result.documentId : undefined,
            caseId: data.caseId,
            userId: session.user.id,
            documentType: data.documentType,
            existingDocumentFound: result.existingDocumentFound,
          },
          "Document generation request handled successfully",
        );

        try {
          await cacheInvalidationService.invalidateCaseMutation({
            userId: session.user.id,
            caseId: data.caseId,
          });
        } catch (err) {
          logger.warn(
            { err, caseId: data.caseId },
            "Failed to invalidate cache on document enqueue"
          );
        }

        revalidatePath(`/case/${data.caseId}`);

        return actionSuccess({
          data: {
            ...result,
          },
        });
      } catch (err) {
        const classified = classifyAIError(err);
        logger.error(
          {
            caseId: data.caseId,
            userId: session.user.id,
            documentType: data.documentType,
            errorCategory: classified.category,
            retryable: classified.retryable,
            statusCode: classified.statusCode,
          },
          "Document generation enqueue failed",
        );

        if (err instanceof AppError) {
          return actionFailure(err.code as any, err.message);
        }

        return actionFailure(
          classified.category === "validation_error"
            ? "VALIDATION_ERROR"
            : classified.category === "quota_error"
              ? "RATE_LIMIT_EXCEEDED"
              : "AI_PROVIDER_ERROR",
          classified.userMessage,
        );
      }
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

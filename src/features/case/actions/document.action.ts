"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { documentService } from "@/features/case/services/document-engine/document.service";
import { documentRepository } from "@/features/case/repositories/document.repository";
import { requireUser, validateActionInput } from "@/lib/validation/action-guard";
import { toClient } from "@/lib/utils";
import { actionSuccess } from "@/lib/action-response";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";

const RenameDocumentSchema = z.object({
  id: z.string().min(1, "Document ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
  title: z.string().min(1, "Document title is required"),
});

const DeleteDocumentSchema = z.object({
  id: z.string().min(1, "Document ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
});

/**
 * Server action to rename a generated document.
 */
export async function renameDocumentAction(id: string, caseId: string, title: string) {
  return validateActionInput(
    RenameDocumentSchema,
    { id, caseId, title },
    async (validated) => {
      const userId = await requireUser();

      const doc = await documentService.renameDocument(
        validated.id,
        userId,
        validated.title,
        validated.caseId
      );

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on document rename for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(doc),
      });
    }
  );
}

/**
 * Server action to delete a single generated document.
 */
export async function deleteDocumentAction(id: string, caseId: string) {
  return validateActionInput(
    DeleteDocumentSchema,
    { id, caseId },
    async (validated) => {
      const userId = await requireUser();

      await documentService.deleteDocument(validated.id, userId, validated.caseId);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on document deletion for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess();
    }
  );
}

/**
 * Server action to fetch all generated documents for a case directly from PostgreSQL.
 * Used for 100% instant UI updates upon background job completion.
 */
export async function getCaseDocumentsAction(caseId: string) {
  const userId = await requireUser();
  try {
    const docs = await documentRepository.findAllByCaseId(caseId, userId);
    return actionSuccess({ data: toClient(docs) });
  } catch (error) {
    logger.error({ error, caseId, userId }, "Failed to fetch case documents");
    return actionSuccess({ data: [] });
  }
}


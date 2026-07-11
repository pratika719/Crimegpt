"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { documentService } from "@/services/document-engine/document.service";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";
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
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

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
        console.warn(`[Cache Invalidation Warning] Failed to invalidate cache on document rename for case ${validated.caseId}:`, err);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: JSON.parse(JSON.stringify(doc)),
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
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      await documentService.deleteDocument(validated.id, userId, validated.caseId);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        console.warn(`[Cache Invalidation Warning] Failed to invalidate cache on document deletion for case ${validated.caseId}:`, err);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess();
    }
  );
}

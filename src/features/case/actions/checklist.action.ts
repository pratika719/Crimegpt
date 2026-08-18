"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checklistService } from "@/features/case/services/checklist.service";
import { requireUser, validateActionInput } from "@/lib/validation/action-guard";
import { toClient } from "@/lib/utils";
import { actionSuccess } from "@/lib/action-response";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";

const CreateChecklistItemSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  title: z.string().min(1, "Task title is required"),
});

const ToggleChecklistItemSchema = z.object({
  id: z.string().min(1, "ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
  completed: z.boolean(),
});

const DeleteChecklistItemSchema = z.object({
  id: z.string().min(1, "ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
});

const RenameChecklistItemSchema = z.object({
  id: z.string().min(1, "ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
  title: z.string().min(1, "Task title is required"),
});

/**
 * Server action to create a new checklist item under a case.
 */
export async function createChecklistItemAction(caseId: string, title: string) {
  return validateActionInput(
    CreateChecklistItemSchema,
    { caseId, title },
    async (validated) => {
      const userId = await requireUser();

      const item = await checklistService.createChecklistItem(
        validated.caseId,
        userId,
        { title: validated.title.trim() }
      );

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on checklist creation for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(item),
      });
    }
  );
}

/**
 * Server action to toggle completion status of a checklist item.
 */
export async function toggleChecklistItemAction(id: string, caseId: string, completed: boolean) {
  return validateActionInput(
    ToggleChecklistItemSchema,
    { id, caseId, completed },
    async (validated) => {
      const userId = await requireUser();

      const item = await checklistService.updateChecklistItem(
        validated.id,
        userId,
        { completed: validated.completed },
        validated.caseId
      );

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on checklist toggle for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(item),
      });
    }
  );
}

/**
 * Server action to delete a checklist item.
 */
export async function deleteChecklistItemAction(id: string, caseId: string) {
  return validateActionInput(
    DeleteChecklistItemSchema,
    { id, caseId },
    async (validated) => {
      const userId = await requireUser();

      const item = await checklistService.deleteChecklistItem(
        validated.id,
        userId,
        validated.caseId
      );

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on checklist deletion for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(item),
      });
    }
  );
}

/**
 * Server action to rename a checklist item's title.
 */
export async function renameChecklistItemAction(id: string, caseId: string, title: string) {
  return validateActionInput(
    RenameChecklistItemSchema,
    { id, caseId, title },
    async (validated) => {
      const userId = await requireUser();

      const item = await checklistService.updateChecklistItem(
        validated.id,
        userId,
        { title: validated.title.trim() },
        validated.caseId
      );

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on checklist rename for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(item),
      });
    }
  );
}

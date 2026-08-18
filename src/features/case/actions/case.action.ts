"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  CreateCaseSchema,
  UpdateCaseSchema,
} from "@/features/case/schemas/case.schema";
import { CaseService } from "@/features/case/services/case.service";
import { requireUser, validateActionInput } from "@/lib/validation/action-guard";
import { toClient } from "@/lib/utils";
import { actionFailure, actionSuccess } from "@/lib/action-response";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";

const service = new CaseService();

const DeleteCaseSchema = z.string().min(1, "Case ID is required");

export async function createCaseAction(input: unknown) {
  return validateActionInput(CreateCaseSchema, input, async (validated) => {
    const userId = await requireUser();

    await service.createCase(userId, validated);

    try {
      await cacheInvalidationService.invalidateCaseDashboard(userId);
      await cacheInvalidationService.invalidateCaseSearch(userId);
    } catch (err) {
      logger.warn({ err }, "Failed to invalidate cache on case creation");
    }

    revalidatePath("/case");

    return actionSuccess();
  });
}

export async function updateCaseAction(id: string, input: unknown) {
  return validateActionInput(UpdateCaseSchema, input, async (validated) => {
    const userId = await requireUser();

    if (!id) {
      return actionFailure("VALIDATION_ERROR", "Case ID is required.");
    }

    const result = await service.updateCase(id, userId, validated);

    try {
      await cacheInvalidationService.invalidateCaseMutation({
        userId,
        caseId: id,
      });
    } catch (err) {
      logger.warn({ err }, `Failed to invalidate cache on case update (${id})`);
    }

    revalidatePath(`/case/${id}`);
    revalidatePath("/case");

    return actionSuccess({
      data: toClient(result),
    });
  });
}

export async function deleteCaseAction(id: string) {
  return validateActionInput(DeleteCaseSchema, id, async (validatedId) => {
    const userId = await requireUser();

    await service.deleteCase(validatedId, userId);

    try {
      await cacheInvalidationService.invalidateCaseMutation({
        userId,
        caseId: validatedId,
      });
    } catch (err) {
      logger.warn({ err }, `Failed to invalidate cache on case deletion (${validatedId})`);
    }

    revalidatePath("/case");

    return actionSuccess();
  });
}
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { evidenceService } from "@/features/case/services/evidence.service";
import { CreateEvidenceInput, UpdateEvidenceInput, createEvidenceSchema, updateEvidenceSchema } from "@/features/case/schemas/evidence.schema";
import { requireUser, validateActionInput } from "@/lib/validation/action-guard";
import { toClient } from "@/lib/utils";
import { actionSuccess } from "@/lib/action-response";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";

const CreateEvidenceActionSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  data: createEvidenceSchema.omit({ caseId: true }),
});

const UpdateEvidenceActionSchema = z.object({
  id: z.string().min(1, "Evidence ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
  data: updateEvidenceSchema,
});

const DeleteEvidenceActionSchema = z.object({
  id: z.string().min(1, "Evidence ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
});

/**
 * Server action to register a new evidence item to a case.
 */
export async function createEvidenceAction(
  caseId: string,
  data: Omit<CreateEvidenceInput, "caseId">
) {
  return validateActionInput(
    CreateEvidenceActionSchema,
    { caseId, data },
    async (validated) => {
      const userId = await requireUser();

      const evidence = await evidenceService.createEvidence(validated.caseId, userId, validated.data);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on evidence creation for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(evidence),
      });
    }
  );
}

/**
 * Server action to update an existing evidence item.
 */
export async function updateEvidenceAction(
  id: string,
  caseId: string,
  data: UpdateEvidenceInput
) {
  return validateActionInput(
    UpdateEvidenceActionSchema,
    { id, caseId, data },
    async (validated) => {
      const userId = await requireUser();

      const evidence = await evidenceService.updateEvidence(validated.id, userId, validated.data, validated.caseId);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on evidence update for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(evidence),
      });
    }
  );
}

/**
 * Server action to remove an evidence item.
 */
export async function deleteEvidenceAction(id: string, caseId: string) {
  return validateActionInput(
    DeleteEvidenceActionSchema,
    { id, caseId },
    async (validated) => {
      const userId = await requireUser();

      const evidence = await evidenceService.deleteEvidence(validated.id, userId, validated.caseId);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on evidence deletion for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(evidence),
      });
    }
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { personService } from "@/features/case/services/person.service";
import { CreatePersonInput, UpdatePersonInput, CreatePersonSchema, UpdatePersonSchema } from "@/features/case/schemas/person.schema";
import { requireUser, validateActionInput } from "@/lib/validation/action-guard";
import { toClient } from "@/lib/utils";
import { actionSuccess } from "@/lib/action-response";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";

const CreatePersonActionSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  data: CreatePersonSchema.omit({ caseId: true }),
});

const UpdatePersonActionSchema = z.object({
  id: z.string().min(1, "Person ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
  data: UpdatePersonSchema,
});

const DeletePersonActionSchema = z.object({
  id: z.string().min(1, "Person ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
});

/**
 * Server action to register a new person to a case.
 */
export async function createPersonAction(
  caseId: string,
  data: Omit<CreatePersonInput, "caseId">
) {
  return validateActionInput(
    CreatePersonActionSchema,
    { caseId, data },
    async (validated) => {
      const userId = await requireUser();

      const person = await personService.createPerson(validated.caseId, userId, validated.data);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on person creation for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(person),
      });
    }
  );
}

/**
 * Server action to update an existing person's details.
 */
export async function updatePersonAction(
  id: string,
  caseId: string,
  data: UpdatePersonInput
) {
  return validateActionInput(
    UpdatePersonActionSchema,
    { id, caseId, data },
    async (validated) => {
      const userId = await requireUser();

      const person = await personService.updatePerson(validated.id, userId, validated.data, validated.caseId);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on person update for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(person),
      });
    }
  );
}

/**
 * Server action to remove a person from a case.
 */
export async function deletePersonAction(id: string, caseId: string) {
  return validateActionInput(
    DeletePersonActionSchema,
    { id, caseId },
    async (validated) => {
      const userId = await requireUser();

      const person = await personService.deletePerson(validated.id, userId, validated.caseId);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        logger.warn({ err }, `Failed to invalidate cache on person deletion for case ${validated.caseId}`);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(person),
      });
    }
  );
}

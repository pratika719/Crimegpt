"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { personService } from "@/services/person/person.service";
import { CreatePersonInput, UpdatePersonInput, CreatePersonSchema, UpdatePersonSchema } from "@/schema/person.schema";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";
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
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const person = await personService.createPerson(validated.caseId, userId, validated.data);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        console.warn(`[Cache Invalidation Warning] Failed to invalidate cache on person creation for case ${validated.caseId}:`, err);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: JSON.parse(JSON.stringify(person)),
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
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const person = await personService.updatePerson(validated.id, userId, validated.data, validated.caseId);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        console.warn(`[Cache Invalidation Warning] Failed to invalidate cache on person update for case ${validated.caseId}:`, err);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: JSON.parse(JSON.stringify(person)),
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
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const person = await personService.deletePerson(validated.id, userId, validated.caseId);

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        console.warn(`[Cache Invalidation Warning] Failed to invalidate cache on person deletion for case ${validated.caseId}:`, err);
      }

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: JSON.parse(JSON.stringify(person)),
      });
    }
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { evidenceService } from "@/services/evidence/evidence.service";
import { CreateEvidenceInput, UpdateEvidenceInput, CreateEvidenceSchema, UpdateEvidenceSchema } from "@/schema/evidence.schema";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";

const CreateEvidenceActionSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  data: CreateEvidenceSchema.omit({ caseId: true }),
});

const UpdateEvidenceActionSchema = z.object({
  id: z.string().min(1, "Evidence ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
  data: UpdateEvidenceSchema,
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
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const evidence = await evidenceService.createEvidence(validated.caseId, userId, validated.data);
      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: JSON.parse(JSON.stringify(evidence)),
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
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const evidence = await evidenceService.updateEvidence(validated.id, userId, validated.data, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: JSON.parse(JSON.stringify(evidence)),
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
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const evidence = await evidenceService.deleteEvidence(validated.id, userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: JSON.parse(JSON.stringify(evidence)),
      });
    }
  );
}

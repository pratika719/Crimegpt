"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { caseMetadataService } from "@/services/case-metadata/case-metadata.service";
import { CreateCaseMetadataInput, UpdateCaseMetadataSchema } from "@/schema/case-metadata.schema";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";

const SaveCaseMetadataSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  data: UpdateCaseMetadataSchema,
});

const GetCaseMetadataSchema = z.string().min(1, "Case ID is required");

/**
 * Server action to save or update (upsert) investigation metadata for a case.
 */
export async function saveCaseMetadataAction(
  caseId: string,
  data: Omit<CreateCaseMetadataInput, "caseId">
) {
  return validateActionInput(
    SaveCaseMetadataSchema,
    { caseId, data },
    async (validated) => {
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const metadata = await caseMetadataService.upsertMetadata(
        validated.caseId,
        userId,
        validated.data
      );

      try {
        await cacheInvalidationService.invalidateCaseMutation({
          userId,
          caseId: validated.caseId,
        });
      } catch (err) {
        console.warn(`[Cache Invalidation Warning] Failed to invalidate cache on metadata save for case ${validated.caseId}:`, err);
      }

      // Revalidate the case detail page so the UI displays the new metadata
      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: JSON.parse(JSON.stringify(metadata)), // Serialize date fields for Next.js client
      });
    }
  );
}

/**
 * Server action to retrieve case metadata.
 */
export async function getCaseMetadataAction(caseId: string) {
  return validateActionInput(
    GetCaseMetadataSchema,
    caseId,
    async (validatedCaseId) => {
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }
      const userId = session.user.id;

      const metadata = await caseMetadataService.getMetadata(validatedCaseId, userId);

      return actionSuccess({
        data: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      });
    }
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activityService } from "@/features/case/services/activity.service";
import { requireUser, validateActionInput } from "@/lib/validation/action-guard";
import { toClient } from "@/lib/utils";
import { actionSuccess } from "@/lib/action-response";

const UpdateTimelineEventSchema = z.object({
  id: z.string().min(1, "Timeline event ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
  description: z.string().min(1, "Description is required"),
});

const DeleteTimelineEventSchema = z.object({
  id: z.string().min(1, "Timeline event ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
});

export async function updateTimelineEventAction(
  id: string,
  caseId: string,
  description: string
) {
  return validateActionInput(
    UpdateTimelineEventSchema,
    { id, caseId, description },
    async (validated) => {
      const userId = await requireUser();

      const event = await activityService.updateTimelineEvent(
        validated.id,
        validated.caseId,
        userId,
        validated.description
      );

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: toClient(event),
      });
    }
  );
}

export async function deleteTimelineEventAction(id: string, caseId: string) {
  return validateActionInput(
    DeleteTimelineEventSchema,
    { id, caseId },
    async (validated) => {
      const userId = await requireUser();

      await activityService.deleteTimelineEvent(validated.id, validated.caseId, userId);

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess();
    }
  );
}

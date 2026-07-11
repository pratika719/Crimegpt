"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { activityService } from "@/services/activity/activity.service";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";

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
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }

      const event = await activityService.updateTimelineEvent(
        validated.id,
        validated.caseId,
        session.user.id,
        validated.description
      );

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess({
        data: JSON.parse(JSON.stringify(event)),
      });
    }
  );
}

export async function deleteTimelineEventAction(id: string, caseId: string) {
  return validateActionInput(
    DeleteTimelineEventSchema,
    { id, caseId },
    async (validated) => {
      const session = await auth();
      if (!session?.user?.id) {
        return actionFailure("UNAUTHORIZED", "Unauthorized");
      }

      await activityService.deleteTimelineEvent(validated.id, validated.caseId, session.user.id);

      revalidatePath(`/case/${validated.caseId}`);

      return actionSuccess();
    }
  );
}

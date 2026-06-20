"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { activityService } from "@/services/activity/activity.service";

export async function updateTimelineEventAction(
  id: string,
  caseId: string,
  description: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    if (!id || !caseId) {
      return { success: false, message: "Timeline event and case are required." };
    }

    const event = await activityService.updateTimelineEvent(
      id,
      caseId,
      session.user.id,
      description
    );

    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(event)),
    };
  } catch (error: any) {
    console.error("Action Failure (updateTimelineEventAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to update timeline event.",
    };
  }
}

export async function deleteTimelineEventAction(id: string, caseId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    if (!id || !caseId) {
      return { success: false, message: "Timeline event and case are required." };
    }

    await activityService.deleteTimelineEvent(id, caseId, session.user.id);

    revalidatePath(`/case/${caseId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Action Failure (deleteTimelineEventAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to delete timeline event.",
    };
  }
}

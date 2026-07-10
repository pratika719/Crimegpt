"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { QUEUE_NAMES } from "@/lib/queue/queue-names";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionFailure, actionSuccess } from "@/lib/action-response";
import { jobStatusService } from "@/services/queue/job-status.service";
import { logger } from "@/lib/logger";

const getJobStatusSchema = z.object({
  queueName: z.nativeEnum(QUEUE_NAMES),
  jobId: z.string().min(1),
});

export async function getJobStatusAction(input: unknown) {
  return validateActionInput(getJobStatusSchema, input, async (data) => {
    const session = await auth();

    if (!session?.user?.id) {
      return actionFailure("UNAUTHORIZED", "Unauthorized");
    }

    try {
      const status = await jobStatusService.getJobStatus({
        queueName: data.queueName,
        jobId: data.jobId,
      });

      return actionSuccess({ data: status });
    } catch (error) {
      logger.error(
        {
          err: error,
          queueName: data.queueName,
          jobId: data.jobId,
          userId: session.user.id,
        },
        "Job status lookup failed",
      );
      throw error;
    }
  });
}
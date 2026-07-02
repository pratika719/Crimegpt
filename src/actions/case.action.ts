"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CreateCaseSchema,
  UpdateCaseSchema,
} from "@/schema/case.schema";
import { CaseService } from "@/services/case/case.services";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";

const service = new CaseService();

const DeleteCaseSchema = z.string().min(1, "Case ID is required");

export async function createCaseAction(input: unknown) {
  return validateActionInput(CreateCaseSchema, input, async (validated) => {
    const session = await auth();
    if (!session?.user?.id) {
      return actionFailure("UNAUTHORIZED", "Unauthorized");
    }

    await service.createCase(session.user.id, validated);
    revalidatePath("/case");

    return actionSuccess();
  });
}

export async function updateCaseAction(id: string, input: unknown) {
  return validateActionInput(UpdateCaseSchema, input, async (validated) => {
    const session = await auth();
    if (!session?.user?.id) {
      return actionFailure("UNAUTHORIZED", "Unauthorized");
    }

    if (!id) {
      return actionFailure("VALIDATION_ERROR", "Case ID is required.");
    }

    const result = await service.updateCase(id, session.user.id, validated);

    revalidatePath(`/case/${id}`);
    revalidatePath("/case");

    return actionSuccess({
      data: JSON.parse(JSON.stringify(result)),
    });
  });
}

export async function deleteCaseAction(id: string) {
  return validateActionInput(DeleteCaseSchema, id, async (validatedId) => {
    const session = await auth();
    if (!session?.user?.id) {
      return actionFailure("UNAUTHORIZED", "Unauthorized");
    }

    await service.deleteCase(validatedId, session.user.id);
    revalidatePath("/case");

    return actionSuccess();
  });
}
"use server";

import { revalidatePath } from "next/cache";

import {
  CreateCaseSchema,
} from "@/schema/case.schema";

import { CaseService } from "@/services/case/case.services";

const service =
  new CaseService();

export async function createCaseAction(
  input: unknown
) {
  try {
    const validated =
      CreateCaseSchema.parse(input);

    await service.createCase(
      validated
    );

    revalidatePath("/cases");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      message:
        "Failed to create case",
    };
  }
}
"use server";

import { revalidatePath } from "next/cache";

import {
  CreateCaseSchema,
} from "@/schema/case.schema";

import { CaseService } from "@/services/case/case.services";
import { auth } from "@/auth";

const service =
  new CaseService();

export async function createCaseAction(
  input: unknown
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    const validated =
      CreateCaseSchema.parse(input);

    await service.createCase(
      session.user.id,
      validated
    );

    revalidatePath("/case");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error creating case:", error);
    return {
      success: false,
      message:
        "Failed to create case",
    };
  }
}
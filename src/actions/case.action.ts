"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CreateCaseSchema,
  UpdateCaseSchema,
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

export async function updateCaseAction(
  id: string,
  input: unknown
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    if (!id) {
      return { success: false, message: "Case ID is required." };
    }

    const validated = UpdateCaseSchema.parse(input);

    const result = await service.updateCase(id, session.user.id, validated);

    revalidatePath(`/case/${id}`);
    revalidatePath("/case");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(result)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (updateCaseAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to update case.",
    };
  }
}

export async function deleteCaseAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    if (!id) {
      return { success: false, message: "Case ID is required." };
    }

    await service.deleteCase(id, session.user.id);

    revalidatePath("/case");

    return { success: true };
  } catch (error: any) {
    console.error("❌ Action Failure (deleteCaseAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to delete case.",
    };
  }
}
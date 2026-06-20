"use server";

import { revalidatePath } from "next/cache";
import { personService } from "@/services/person/person.service";
import { CreatePersonInput, UpdatePersonInput } from "@/schema/person.schema";
import { auth } from "@/auth";

/**
 * Server action to register a new person to a case.
 */
export async function createPersonAction(
  caseId: string,
  data: Omit<CreatePersonInput, "caseId">
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!caseId) {
      return { success: false, message: "Case ID is required." };
    }

    const person = await personService.createPerson(caseId, userId, data);
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(person)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (createPersonAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to add person to case.",
    };
  }
}

/**
 * Server action to update an existing person's details.
 */
export async function updatePersonAction(
  id: string,
  caseId: string,
  data: UpdatePersonInput
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const person = await personService.updatePerson(id, userId, data, caseId);
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(person)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (updatePersonAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to update person details.",
    };
  }
}

/**
 * Server action to remove a person from a case.
 */
export async function deletePersonAction(id: string, caseId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }
    const userId = session.user.id;

    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const person = await personService.deletePerson(id, userId, caseId);
    revalidatePath(`/case/${caseId}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(person)),
    };
  } catch (error: any) {
    console.error("❌ Action Failure (deletePersonAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to remove person.",
    };
  }
}

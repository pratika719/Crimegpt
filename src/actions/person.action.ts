"use server";

import { revalidatePath } from "next/cache";
import { personService } from "@/services/person/person.service";
import { CreatePersonInput, UpdatePersonInput } from "@/schema/person.schema";

/**
 * Server action to register a new person to a case.
 */
export async function createPersonAction(
  caseId: string,
  data: Omit<CreatePersonInput, "caseId">
) {
  try {
    if (!caseId) {
      return { success: false, message: "Case ID is required." };
    }

    const person = await personService.createPerson(caseId, data);
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
    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const person = await personService.updatePerson(id, data);
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
    if (!id || !caseId) {
      return { success: false, message: "ID and Case ID are required." };
    }

    const person = await personService.deletePerson(id);
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

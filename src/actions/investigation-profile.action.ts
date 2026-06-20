"use server";

import { revalidatePath } from "next/cache";
import { investigationProfileService } from "@/services/investigation-profile/investigation-profile.service";
import { auth } from "@/auth";

async function getSessionUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function upsertInvestigationProfileAction(caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.upsertProfile(caseId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update investigation profile." };
  }
}

// Victims
export async function addVictimAction(caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.addVictim(caseId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add victim." };
  }
}

export async function updateVictimAction(victimId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.updateVictim(victimId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update victim." };
  }
}

export async function deleteVictimAction(victimId: string, caseId: string) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.deleteVictim(victimId, userId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete victim." };
  }
}

// Accused
export async function addAccusedAction(caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.addAccused(caseId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add accused." };
  }
}

export async function updateAccusedAction(accusedId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.updateAccused(accusedId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update accused." };
  }
}

export async function deleteAccusedAction(accusedId: string, caseId: string) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.deleteAccused(accusedId, userId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete accused." };
  }
}

// Witness
export async function addWitnessAction(caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.addWitness(caseId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add witness." };
  }
}

export async function updateWitnessAction(witnessId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.updateWitness(witnessId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update witness." };
  }
}

export async function deleteWitnessAction(witnessId: string, caseId: string) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.deleteWitness(witnessId, userId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete witness." };
  }
}

// Vehicles
export async function addVehicleAction(caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.addVehicle(caseId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add vehicle." };
  }
}

export async function updateVehicleAction(vehicleId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.updateVehicle(vehicleId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update vehicle." };
  }
}

export async function deleteVehicleAction(vehicleId: string, caseId: string) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.deleteVehicle(vehicleId, userId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete vehicle." };
  }
}

// Seized Property
export async function addSeizedItemAction(caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.addSeizedItem(caseId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add seized item." };
  }
}

export async function updateSeizedItemAction(itemId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.updateSeizedItem(itemId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update seized item." };
  }
}

export async function deleteSeizedItemAction(itemId: string, caseId: string) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.deleteSeizedItem(itemId, userId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete seized item." };
  }
}

// Medical
export async function addMedicalInfoAction(caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.addMedicalInfo(caseId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add medical details." };
  }
}

export async function updateMedicalInfoAction(medicalInfoId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.updateMedicalInfo(medicalInfoId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update medical details." };
  }
}

export async function deleteMedicalInfoAction(medicalInfoId: string, caseId: string) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.deleteMedicalInfo(medicalInfoId, userId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete medical details." };
  }
}

// Court
export async function addCourtInfoAction(caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.addCourtInfo(caseId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add court details." };
  }
}

export async function updateCourtInfoAction(courtInfoId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.updateCourtInfo(courtInfoId, userId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update court details." };
  }
}

export async function deleteCourtInfoAction(courtInfoId: string, caseId: string) {
  try {
    const userId = await getSessionUserId();
    await investigationProfileService.deleteCourtInfo(courtInfoId, userId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete court details." };
  }
}

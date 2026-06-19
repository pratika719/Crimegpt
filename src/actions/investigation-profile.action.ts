"use server";

import { revalidatePath } from "next/cache";
import { investigationProfileService } from "@/services/investigation-profile/investigation-profile.service";

export async function upsertInvestigationProfileAction(caseId: string, data: any) {
  try {
    await investigationProfileService.upsertProfile(caseId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update investigation profile." };
  }
}

// Victims
export async function addVictimAction(caseId: string, data: any) {
  try {
    await investigationProfileService.addVictim(caseId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add victim." };
  }
}

export async function updateVictimAction(victimId: string, caseId: string, data: any) {
  try {
    await investigationProfileService.updateVictim(victimId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update victim." };
  }
}

export async function deleteVictimAction(victimId: string, caseId: string) {
  try {
    await investigationProfileService.deleteVictim(victimId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete victim." };
  }
}

// Accused
export async function addAccusedAction(caseId: string, data: any) {
  try {
    await investigationProfileService.addAccused(caseId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add accused." };
  }
}

export async function updateAccusedAction(accusedId: string, caseId: string, data: any) {
  try {
    await investigationProfileService.updateAccused(accusedId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update accused." };
  }
}

export async function deleteAccusedAction(accusedId: string, caseId: string) {
  try {
    await investigationProfileService.deleteAccused(accusedId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete accused." };
  }
}

// Witness
export async function addWitnessAction(caseId: string, data: any) {
  try {
    await investigationProfileService.addWitness(caseId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add witness." };
  }
}

export async function updateWitnessAction(witnessId: string, caseId: string, data: any) {
  try {
    await investigationProfileService.updateWitness(witnessId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update witness." };
  }
}

export async function deleteWitnessAction(witnessId: string, caseId: string) {
  try {
    await investigationProfileService.deleteWitness(witnessId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete witness." };
  }
}

// Vehicles
export async function addVehicleAction(caseId: string, data: any) {
  try {
    await investigationProfileService.addVehicle(caseId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add vehicle." };
  }
}

export async function updateVehicleAction(vehicleId: string, caseId: string, data: any) {
  try {
    await investigationProfileService.updateVehicle(vehicleId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update vehicle." };
  }
}

export async function deleteVehicleAction(vehicleId: string, caseId: string) {
  try {
    await investigationProfileService.deleteVehicle(vehicleId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete vehicle." };
  }
}

// Seized Property
export async function addSeizedItemAction(caseId: string, data: any) {
  try {
    await investigationProfileService.addSeizedItem(caseId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add seized item." };
  }
}

export async function updateSeizedItemAction(itemId: string, caseId: string, data: any) {
  try {
    await investigationProfileService.updateSeizedItem(itemId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update seized item." };
  }
}

export async function deleteSeizedItemAction(itemId: string, caseId: string) {
  try {
    await investigationProfileService.deleteSeizedItem(itemId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete seized item." };
  }
}

// Medical
export async function addMedicalInfoAction(caseId: string, data: any) {
  try {
    await investigationProfileService.addMedicalInfo(caseId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add medical details." };
  }
}

export async function updateMedicalInfoAction(medicalInfoId: string, caseId: string, data: any) {
  try {
    await investigationProfileService.updateMedicalInfo(medicalInfoId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update medical details." };
  }
}

export async function deleteMedicalInfoAction(medicalInfoId: string, caseId: string) {
  try {
    await investigationProfileService.deleteMedicalInfo(medicalInfoId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete medical details." };
  }
}

// Court
export async function addCourtInfoAction(caseId: string, data: any) {
  try {
    await investigationProfileService.addCourtInfo(caseId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add court details." };
  }
}

export async function updateCourtInfoAction(courtInfoId: string, caseId: string, data: any) {
  try {
    await investigationProfileService.updateCourtInfo(courtInfoId, data);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to update court details." };
  }
}

export async function deleteCourtInfoAction(courtInfoId: string, caseId: string) {
  try {
    await investigationProfileService.deleteCourtInfo(courtInfoId);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to delete court details." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { investigationProfileService } from "@/services/investigation-profile/investigation-profile.service";
import { auth } from "@/auth";
import {
  InvestigationProfileSchema,
  VictimSchema,
  AccusedSchema,
  WitnessSchema,
  VehicleSchema,
  SeizedItemSchema,
  MedicalInformationSchema,
  CourtInformationSchema,
} from "@/schema/investigation-profile.schema";

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
    const parsed = InvestigationProfileSchema.parse(data);
    
    // Parse date fields if they are strings
    const formattedData = {
      ...parsed,
      dateOfRegistration: parsed.dateOfRegistration ? new Date(parsed.dateOfRegistration) : null,
      incidentDateTime: parsed.incidentDateTime ? new Date(parsed.incidentDateTime) : null,
    };

    await investigationProfileService.upsertProfile(caseId, userId, formattedData);
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
    const parsed = VictimSchema.parse(data);
    await investigationProfileService.addVictim(caseId, userId, parsed);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add victim." };
  }
}

export async function updateVictimAction(victimId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    const parsed = VictimSchema.partial().parse(data);
    await investigationProfileService.updateVictim(victimId, userId, parsed);
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
    const parsed = AccusedSchema.parse(data);
    await investigationProfileService.addAccused(caseId, userId, parsed);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add accused." };
  }
}

export async function updateAccusedAction(accusedId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    const parsed = AccusedSchema.partial().parse(data);
    await investigationProfileService.updateAccused(accusedId, userId, parsed);
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
    const parsed = WitnessSchema.parse(data);

    const formattedData = {
      ...parsed,
      statementDate: parsed.statementDate ? new Date(parsed.statementDate) : null,
    };

    await investigationProfileService.addWitness(caseId, userId, formattedData);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add witness." };
  }
}

export async function updateWitnessAction(witnessId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    const parsed = WitnessSchema.partial().parse(data);

    const formattedData = {
      ...parsed,
      statementDate: parsed.statementDate ? new Date(parsed.statementDate) : undefined,
    };

    await investigationProfileService.updateWitness(witnessId, userId, formattedData);
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
    const parsed = VehicleSchema.parse(data);
    await investigationProfileService.addVehicle(caseId, userId, parsed);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add vehicle." };
  }
}

export async function updateVehicleAction(vehicleId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    const parsed = VehicleSchema.partial().parse(data);
    await investigationProfileService.updateVehicle(vehicleId, userId, parsed);
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
    const parsed = SeizedItemSchema.parse(data);

    const formattedData = {
      ...parsed,
      seizureDate: parsed.seizureDate ? new Date(parsed.seizureDate) : null,
    };

    await investigationProfileService.addSeizedItem(caseId, userId, formattedData);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add seized item." };
  }
}

export async function updateSeizedItemAction(itemId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    const parsed = SeizedItemSchema.partial().parse(data);

    const formattedData = {
      ...parsed,
      seizureDate: parsed.seizureDate ? new Date(parsed.seizureDate) : undefined,
    };

    await investigationProfileService.updateSeizedItem(itemId, userId, formattedData);
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
    const parsed = MedicalInformationSchema.parse(data);

    const formattedData = {
      ...parsed,
      admissionDate: parsed.admissionDate ? new Date(parsed.admissionDate) : null,
    };

    await investigationProfileService.addMedicalInfo(caseId, userId, formattedData);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add medical details." };
  }
}

export async function updateMedicalInfoAction(medicalInfoId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    const parsed = MedicalInformationSchema.partial().parse(data);

    const formattedData = {
      ...parsed,
      admissionDate: parsed.admissionDate ? new Date(parsed.admissionDate) : undefined,
    };

    await investigationProfileService.updateMedicalInfo(medicalInfoId, userId, formattedData);
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
    const parsed = CourtInformationSchema.parse(data);

    const formattedData = {
      ...parsed,
      nextHearingDate: parsed.nextHearingDate ? new Date(parsed.nextHearingDate) : null,
      chargesheetFiledDate: parsed.chargesheetFiledDate ? new Date(parsed.chargesheetFiledDate) : null,
    };

    await investigationProfileService.addCourtInfo(caseId, userId, formattedData);
    revalidatePath(`/case/${caseId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to add court details." };
  }
}

export async function updateCourtInfoAction(courtInfoId: string, caseId: string, data: any) {
  try {
    const userId = await getSessionUserId();
    const parsed = CourtInformationSchema.partial().parse(data);

    const formattedData = {
      ...parsed,
      nextHearingDate: parsed.nextHearingDate ? new Date(parsed.nextHearingDate) : undefined,
      chargesheetFiledDate: parsed.chargesheetFiledDate ? new Date(parsed.chargesheetFiledDate) : undefined,
    };

    await investigationProfileService.updateCourtInfo(courtInfoId, userId, formattedData);
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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { investigationProfileService } from "@/services/investigation-profile/investigation-profile.service";
import { auth } from "@/auth";
import { validateActionInput } from "@/lib/validation/action-guard";
import { actionSuccess } from "@/lib/action-response";
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
import { cacheInvalidationService } from "@/services/cache/cache-invalidation.service";

async function getSessionUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

async function safeInvalidate(userId: string, caseId: string) {
  try {
    await cacheInvalidationService.invalidateCaseMutation({ userId, caseId });
  } catch (err) {
    console.warn(`[Cache Invalidation Warning] Failed to invalidate cache for case ${caseId}:`, err);
  }
}

// Reusable schemas for validation wrapper
const CaseIdAndDataSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    caseId: z.string().min(1, "Case ID is required"),
    data: dataSchema,
  });

const IdCaseIdAndDataSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    id: z.string().min(1, "ID is required"),
    caseId: z.string().min(1, "Case ID is required"),
    data: dataSchema,
  });

const IdAndCaseIdSchema = z.object({
  id: z.string().min(1, "ID is required"),
  caseId: z.string().min(1, "Case ID is required"),
});

export async function upsertInvestigationProfileAction(caseId: string, data: any) {
  return validateActionInput(
    CaseIdAndDataSchema(InvestigationProfileSchema),
    { caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      const formattedData = {
        ...validated.data,
        dateOfRegistration: validated.data.dateOfRegistration ? new Date(validated.data.dateOfRegistration) : null,
        incidentDateTime: validated.data.incidentDateTime ? new Date(validated.data.incidentDateTime) : null,
      };

      await investigationProfileService.upsertProfile(validated.caseId, userId, formattedData);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

// Victims
export async function addVictimAction(caseId: string, data: any) {
  return validateActionInput(
    CaseIdAndDataSchema(VictimSchema),
    { caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.addVictim(validated.caseId, userId, validated.data);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function updateVictimAction(victimId: string, caseId: string, data: any) {
  return validateActionInput(
    IdCaseIdAndDataSchema(VictimSchema.partial()),
    { id: victimId, caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.updateVictim(validated.id, userId, validated.data);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function deleteVictimAction(victimId: string, caseId: string) {
  return validateActionInput(
    IdAndCaseIdSchema,
    { id: victimId, caseId },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.deleteVictim(validated.id, userId);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

// Accused
export async function addAccusedAction(caseId: string, data: any) {
  return validateActionInput(
    CaseIdAndDataSchema(AccusedSchema),
    { caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.addAccused(validated.caseId, userId, validated.data);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function updateAccusedAction(accusedId: string, caseId: string, data: any) {
  return validateActionInput(
    IdCaseIdAndDataSchema(AccusedSchema.partial()),
    { id: accusedId, caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.updateAccused(validated.id, userId, validated.data);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function deleteAccusedAction(accusedId: string, caseId: string) {
  return validateActionInput(
    IdAndCaseIdSchema,
    { id: accusedId, caseId },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.deleteAccused(validated.id, userId);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

// Witness
export async function addWitnessAction(caseId: string, data: any) {
  return validateActionInput(
    CaseIdAndDataSchema(WitnessSchema),
    { caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      const formattedData = {
        ...validated.data,
        statementDate: validated.data.statementDate ? new Date(validated.data.statementDate) : null,
      };

      await investigationProfileService.addWitness(validated.caseId, userId, formattedData);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function updateWitnessAction(witnessId: string, caseId: string, data: any) {
  return validateActionInput(
    IdCaseIdAndDataSchema(WitnessSchema.partial()),
    { id: witnessId, caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      const formattedData = {
        ...validated.data,
        statementDate: validated.data.statementDate ? new Date(validated.data.statementDate) : undefined,
      };

      await investigationProfileService.updateWitness(validated.id, userId, formattedData);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function deleteWitnessAction(witnessId: string, caseId: string) {
  return validateActionInput(
    IdAndCaseIdSchema,
    { id: witnessId, caseId },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.deleteWitness(validated.id, userId);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

// Vehicles
export async function addVehicleAction(caseId: string, data: any) {
  return validateActionInput(
    CaseIdAndDataSchema(VehicleSchema),
    { caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.addVehicle(validated.caseId, userId, validated.data);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function updateVehicleAction(vehicleId: string, caseId: string, data: any) {
  return validateActionInput(
    IdCaseIdAndDataSchema(VehicleSchema.partial()),
    { id: vehicleId, caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.updateVehicle(validated.id, userId, validated.data);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function deleteVehicleAction(vehicleId: string, caseId: string) {
  return validateActionInput(
    IdAndCaseIdSchema,
    { id: vehicleId, caseId },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.deleteVehicle(validated.id, userId);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

// Seized Property
export async function addSeizedItemAction(caseId: string, data: any) {
  return validateActionInput(
    CaseIdAndDataSchema(SeizedItemSchema),
    { caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      const formattedData = {
        ...validated.data,
        seizureDate: validated.data.seizureDate ? new Date(validated.data.seizureDate) : null,
      };

      await investigationProfileService.addSeizedItem(validated.caseId, userId, formattedData);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function updateSeizedItemAction(itemId: string, caseId: string, data: any) {
  return validateActionInput(
    IdCaseIdAndDataSchema(SeizedItemSchema.partial()),
    { id: itemId, caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      const formattedData = {
        ...validated.data,
        seizureDate: validated.data.seizureDate ? new Date(validated.data.seizureDate) : undefined,
      };

      await investigationProfileService.updateSeizedItem(validated.id, userId, formattedData);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function deleteSeizedItemAction(itemId: string, caseId: string) {
  return validateActionInput(
    IdAndCaseIdSchema,
    { id: itemId, caseId },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.deleteSeizedItem(validated.id, userId);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

// Medical
export async function addMedicalInfoAction(caseId: string, data: any) {
  return validateActionInput(
    CaseIdAndDataSchema(MedicalInformationSchema),
    { caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      const formattedData = {
        ...validated.data,
        admissionDate: validated.data.admissionDate ? new Date(validated.data.admissionDate) : null,
      };

      await investigationProfileService.addMedicalInfo(validated.caseId, userId, formattedData);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function updateMedicalInfoAction(medicalInfoId: string, caseId: string, data: any) {
  return validateActionInput(
    IdCaseIdAndDataSchema(MedicalInformationSchema.partial()),
    { id: medicalInfoId, caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      const formattedData = {
        ...validated.data,
        admissionDate: validated.data.admissionDate ? new Date(validated.data.admissionDate) : undefined,
      };

      await investigationProfileService.updateMedicalInfo(validated.id, userId, formattedData);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function deleteMedicalInfoAction(medicalInfoId: string, caseId: string) {
  return validateActionInput(
    IdAndCaseIdSchema,
    { id: medicalInfoId, caseId },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.deleteMedicalInfo(validated.id, userId);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

// Court
export async function addCourtInfoAction(caseId: string, data: any) {
  return validateActionInput(
    CaseIdAndDataSchema(CourtInformationSchema),
    { caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      const formattedData = {
        ...validated.data,
        nextHearingDate: validated.data.nextHearingDate ? new Date(validated.data.nextHearingDate) : null,
        chargesheetFiledDate: validated.data.chargesheetFiledDate ? new Date(validated.data.chargesheetFiledDate) : null,
      };

      await investigationProfileService.addCourtInfo(validated.caseId, userId, formattedData);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function updateCourtInfoAction(courtInfoId: string, caseId: string, data: any) {
  return validateActionInput(
    IdCaseIdAndDataSchema(CourtInformationSchema.partial()),
    { id: courtInfoId, caseId, data },
    async (validated) => {
      const userId = await getSessionUserId();
      const formattedData = {
        ...validated.data,
        nextHearingDate: validated.data.nextHearingDate ? new Date(validated.data.nextHearingDate) : undefined,
        chargesheetFiledDate: validated.data.chargesheetFiledDate ? new Date(validated.data.chargesheetFiledDate) : undefined,
      };

      await investigationProfileService.updateCourtInfo(validated.id, userId, formattedData);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

export async function deleteCourtInfoAction(courtInfoId: string, caseId: string) {
  return validateActionInput(
    IdAndCaseIdSchema,
    { id: courtInfoId, caseId },
    async (validated) => {
      const userId = await getSessionUserId();
      await investigationProfileService.deleteCourtInfo(validated.id, userId);
      await safeInvalidate(userId, validated.caseId);
      revalidatePath(`/case/${validated.caseId}`);
      return actionSuccess();
    }
  );
}

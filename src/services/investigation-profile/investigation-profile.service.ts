import { investigationProfileRepository } from "@/repositories/investigation-profile.repository";
import { activityService } from "@/services/activity/activity.service";
import { prisma } from "@/lib/prisma";

export class InvestigationProfileService {
  private repository = investigationProfileRepository;

  async getProfile(caseId: string, userId: string) {
    return this.repository.getProfile(caseId, userId);
  }

  async upsertProfile(caseId: string, userId: string, data: {
    firNumber?: string | null;
    policeStation?: string | null;
    investigatingOfficer?: string | null;
    dateOfRegistration?: Date | null;
    incidentDateTime?: Date | null;
    incidentLocation?: string | null;
    incidentDescription?: string | null;
    investigationNotes?: string | null;
  }) {
    const profile = await this.repository.upsertProfile(caseId, userId, data);
    await activityService.logInvestigationProfileUpdated(caseId);
    return profile;
  }

  // --- Victims ---
  async addVictim(caseId: string, userId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    injuryDetails?: string | null;
    status?: string | null;
  }) {
    const victim = await this.repository.addVictim(caseId, userId, data);
    await activityService.logVictimAdded(caseId, victim.person.name);
    return victim;
  }

  async updateVictim(id: string, userId: string, data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    injuryDetails?: string | null;
    status?: string | null;
  }) {
    const victim = await this.repository.updateVictim(id, userId, data);
    await activityService.logVictimUpdated(victim.caseId, victim.person.name);
    return victim;
  }

  async deleteVictim(id: string, userId: string) {
    const victim = await this.repository.findVictimById(id, userId);
    if (!victim) throw new Error("Victim not found or access denied.");

    await this.repository.deleteVictim(id, userId);
    await activityService.logVictimDeleted(victim.caseId, victim.person.name);
    return victim;
  }

  // --- Accused ---
  async addAccused(caseId: string, userId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    arrestStatus?: string | null;
    bailDetails?: string | null;
  }) {
    const accused = await this.repository.addAccused(caseId, userId, data);
    await activityService.logAccusedAdded(caseId, accused.person.name);
    return accused;
  }

  async updateAccused(id: string, userId: string, data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    arrestStatus?: string | null;
    bailDetails?: string | null;
  }) {
    const accused = await this.repository.updateAccused(id, userId, data);
    await activityService.logAccusedUpdated(accused.caseId, accused.person.name);
    return accused;
  }

  async deleteAccused(id: string, userId: string) {
    const accused = await this.repository.findAccusedById(id, userId);
    if (!accused) throw new Error("Accused not found or access denied.");

    await this.repository.deleteAccused(id, userId);
    await activityService.logAccusedDeleted(accused.caseId, accused.person.name);
    return accused;
  }

  // --- Witnesses ---
  async addWitness(caseId: string, userId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    statementDate?: Date | null;
    credibilityScore?: string | null;
  }) {
    const witness = await this.repository.addWitness(caseId, userId, data);
    await activityService.logWitnessAdded(caseId, witness.person.name);
    return witness;
  }

  async updateWitness(id: string, userId: string, data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    statementDate?: Date | null;
    credibilityScore?: string | null;
  }) {
    const witness = await this.repository.updateWitness(id, userId, data);
    await activityService.logWitnessUpdated(witness.caseId, witness.person.name);
    return witness;
  }

  async deleteWitness(id: string, userId: string) {
    const witness = await this.repository.findWitnessById(id, userId);
    if (!witness) throw new Error("Witness not found or access denied.");

    await this.repository.deleteWitness(id, userId);
    await activityService.logWitnessDeleted(witness.caseId, witness.person.name);
    return witness;
  }

  // --- Vehicles ---
  async addVehicle(caseId: string, userId: string, data: {
    make?: string | null;
    model?: string | null;
    year?: number | null;
    color?: string | null;
    licensePlate?: string | null;
    registrationState?: string | null;
    ownerName?: string | null;
    seizureStatus?: string | null;
    notes?: string | null;
  }) {
    const vehicle = await this.repository.addVehicle(caseId, userId, data);
    await activityService.logVehicleAdded(caseId, vehicle.licensePlate || "Unknown");
    return vehicle;
  }

  async updateVehicle(id: string, userId: string, data: {
    make?: string | null;
    model?: string | null;
    year?: number | null;
    color?: string | null;
    licensePlate?: string | null;
    registrationState?: string | null;
    ownerName?: string | null;
    seizureStatus?: string | null;
    notes?: string | null;
  }) {
    const vehicle = await this.repository.updateVehicle(id, userId, data);
    await activityService.logVehicleUpdated(vehicle.caseId, vehicle.licensePlate || "Unknown");
    return vehicle;
  }

  async deleteVehicle(id: string, userId: string) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, case: { userId } },
    });
    if (!vehicle) throw new Error("Vehicle not found or access denied.");

    await this.repository.deleteVehicle(id, userId);
    await activityService.logVehicleDeleted(vehicle.caseId, vehicle.licensePlate || "Unknown");
    return vehicle;
  }

  // --- Seized Items ---
  async addSeizedItem(caseId: string, userId: string, data: {
    itemName: string;
    description?: string | null;
    serialNumber?: string | null;
    seizureLocation?: string | null;
    seizureDate?: Date | null;
    officerInCharge?: string | null;
    storageLocation?: string | null;
    status?: string | null;
  }) {
    const item = await this.repository.addSeizedItem(caseId, userId, data);
    await activityService.logSeizedItemAdded(caseId, item.itemName);
    return item;
  }

  async updateSeizedItem(id: string, userId: string, data: {
    itemName?: string;
    description?: string | null;
    serialNumber?: string | null;
    seizureLocation?: string | null;
    seizureDate?: Date | null;
    officerInCharge?: string | null;
    storageLocation?: string | null;
    status?: string | null;
  }) {
    const item = await this.repository.updateSeizedItem(id, userId, data);
    await activityService.logSeizedItemUpdated(item.caseId, item.itemName);
    return item;
  }

  async deleteSeizedItem(id: string, userId: string) {
    const item = await prisma.seizedItem.findFirst({
      where: { id, case: { userId } },
    });
    if (!item) throw new Error("Seized item not found or access denied.");

    await this.repository.deleteSeizedItem(id, userId);
    await activityService.logSeizedItemDeleted(item.caseId, item.itemName);
    return item;
  }

  // --- Medical Info ---
  async addMedicalInfo(caseId: string, userId: string, data: {
    hospitalName?: string | null;
    doctorName?: string | null;
    admissionDate?: Date | null;
    injuryType?: string | null;
    medicalReportNo?: string | null;
    treatmentDetails?: string | null;
    severity?: string | null;
  }) {
    const info = await this.repository.addMedicalInfo(caseId, userId, data);
    await activityService.logMedicalInfoAdded(caseId, info.doctorName || "Unknown");
    return info;
  }

  async updateMedicalInfo(id: string, userId: string, data: {
    hospitalName?: string | null;
    doctorName?: string | null;
    admissionDate?: Date | null;
    injuryType?: string | null;
    medicalReportNo?: string | null;
    treatmentDetails?: string | null;
    severity?: string | null;
  }) {
    const info = await this.repository.updateMedicalInfo(id, userId, data);
    await activityService.logMedicalInfoUpdated(info.caseId, info.doctorName || "Unknown");
    return info;
  }

  async deleteMedicalInfo(id: string, userId: string) {
    const info = await prisma.medicalInformation.findFirst({
      where: { id, case: { userId } },
    });
    if (!info) throw new Error("Medical info not found or access denied.");

    await this.repository.deleteMedicalInfo(id, userId);
    await activityService.logMedicalInfoDeleted(info.caseId, info.doctorName || "Unknown");
    return info;
  }

  // --- Court Info ---
  async addCourtInfo(caseId: string, userId: string, data: {
    courtName?: string | null;
    judgeName?: string | null;
    caseNumber?: string | null;
    nextHearingDate?: Date | null;
    chargesheetFiledDate?: Date | null;
    currentStatus?: string | null;
    judgementDetails?: string | null;
  }) {
    const info = await this.repository.addCourtInfo(caseId, userId, data);
    await activityService.logCourtInfoAdded(caseId, info.caseNumber || "Unknown");
    return info;
  }

  async updateCourtInfo(id: string, userId: string, data: {
    courtName?: string | null;
    judgeName?: string | null;
    caseNumber?: string | null;
    nextHearingDate?: Date | null;
    chargesheetFiledDate?: Date | null;
    currentStatus?: string | null;
    judgementDetails?: string | null;
  }) {
    const info = await this.repository.updateCourtInfo(id, userId, data);
    await activityService.logCourtInfoUpdated(info.caseId, info.caseNumber || "Unknown");
    return info;
  }

  async deleteCourtInfo(id: string, userId: string) {
    const info = await prisma.courtInformation.findFirst({
      where: { id, case: { userId } },
    });
    if (!info) throw new Error("Court info not found or access denied.");

    await this.repository.deleteCourtInfo(id, userId);
    await activityService.logCourtInfoDeleted(info.caseId, info.caseNumber || "Unknown");
    return info;
  }
}

export const investigationProfileService = new InvestigationProfileService();
export default investigationProfileService;

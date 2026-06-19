import { investigationProfileRepository } from "@/repositories/investigation-profile.repository";
import { activityService } from "@/services/activity/activity.service";
import { prisma } from "@/lib/prisma";

export class InvestigationProfileService {
  private repository = investigationProfileRepository;

  async getProfile(caseId: string) {
    return this.repository.getProfile(caseId);
  }

  async upsertProfile(caseId: string, data: {
    firNumber?: string | null;
    policeStation?: string | null;
    investigatingOfficer?: string | null;
    dateOfRegistration?: Date | null;
    incidentDateTime?: Date | null;
    incidentLocation?: string | null;
    incidentDescription?: string | null;
    investigationNotes?: string | null;
  }) {
    const profile = await this.repository.upsertProfile(caseId, data);
    await activityService.logInvestigationProfileUpdated(caseId);
    return profile;
  }

  // --- Victims ---
  async addVictim(caseId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    injuryDetails?: string | null;
    status?: string | null;
  }) {
    const victim = await this.repository.addVictim(caseId, data);
    await activityService.logVictimAdded(caseId, victim.person.name);
    return victim;
  }

  async updateVictim(id: string, data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    injuryDetails?: string | null;
    status?: string | null;
  }) {
    const victim = await this.repository.updateVictim(id, data);
    await activityService.logVictimUpdated(victim.caseId, victim.person.name);
    return victim;
  }

  async deleteVictim(id: string) {
    const victim = await this.repository.findVictimById(id);
    if (!victim) throw new Error("Victim not found");

    await this.repository.deleteVictim(id);
    await activityService.logVictimDeleted(victim.caseId, victim.person.name);
    return victim;
  }

  // --- Accused ---
  async addAccused(caseId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    arrestStatus?: string | null;
    bailDetails?: string | null;
  }) {
    const accused = await this.repository.addAccused(caseId, data);
    await activityService.logAccusedAdded(caseId, accused.person.name);
    return accused;
  }

  async updateAccused(id: string, data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    arrestStatus?: string | null;
    bailDetails?: string | null;
  }) {
    const accused = await this.repository.updateAccused(id, data);
    await activityService.logAccusedUpdated(accused.caseId, accused.person.name);
    return accused;
  }

  async deleteAccused(id: string) {
    const accused = await this.repository.findAccusedById(id);
    if (!accused) throw new Error("Accused not found");

    await this.repository.deleteAccused(id);
    await activityService.logAccusedDeleted(accused.caseId, accused.person.name);
    return accused;
  }

  // --- Witnesses ---
  async addWitness(caseId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    statementDate?: Date | null;
    credibilityScore?: string | null;
  }) {
    const witness = await this.repository.addWitness(caseId, data);
    await activityService.logWitnessAdded(caseId, witness.person.name);
    return witness;
  }

  async updateWitness(id: string, data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    statementDate?: Date | null;
    credibilityScore?: string | null;
  }) {
    const witness = await this.repository.updateWitness(id, data);
    await activityService.logWitnessUpdated(witness.caseId, witness.person.name);
    return witness;
  }

  async deleteWitness(id: string) {
    const witness = await this.repository.findWitnessById(id);
    if (!witness) throw new Error("Witness not found");

    await this.repository.deleteWitness(id);
    await activityService.logWitnessDeleted(witness.caseId, witness.person.name);
    return witness;
  }

  // --- Vehicles ---
  async addVehicle(caseId: string, data: {
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
    const vehicle = await this.repository.addVehicle(caseId, data);
    await activityService.logVehicleAdded(caseId, vehicle.licensePlate || "Unknown");
    return vehicle;
  }

  async updateVehicle(id: string, data: {
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
    const vehicle = await this.repository.updateVehicle(id, data);
    await activityService.logVehicleUpdated(vehicle.caseId, vehicle.licensePlate || "Unknown");
    return vehicle;
  }

  async deleteVehicle(id: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new Error("Vehicle not found");

    await this.repository.deleteVehicle(id);
    await activityService.logVehicleDeleted(vehicle.caseId, vehicle.licensePlate || "Unknown");
    return vehicle;
  }

  // --- Seized Items ---
  async addSeizedItem(caseId: string, data: {
    itemName: string;
    description?: string | null;
    serialNumber?: string | null;
    seizureLocation?: string | null;
    seizureDate?: Date | null;
    officerInCharge?: string | null;
    storageLocation?: string | null;
    status?: string | null;
  }) {
    const item = await this.repository.addSeizedItem(caseId, data);
    await activityService.logSeizedItemAdded(caseId, item.itemName);
    return item;
  }

  async updateSeizedItem(id: string, data: {
    itemName?: string;
    description?: string | null;
    serialNumber?: string | null;
    seizureLocation?: string | null;
    seizureDate?: Date | null;
    officerInCharge?: string | null;
    storageLocation?: string | null;
    status?: string | null;
  }) {
    const item = await this.repository.updateSeizedItem(id, data);
    await activityService.logSeizedItemUpdated(item.caseId, item.itemName);
    return item;
  }

  async deleteSeizedItem(id: string) {
    const item = await prisma.seizedItem.findUnique({ where: { id } });
    if (!item) throw new Error("Seized item not found");

    await this.repository.deleteSeizedItem(id);
    await activityService.logSeizedItemDeleted(item.caseId, item.itemName);
    return item;
  }

  // --- Medical Info ---
  async addMedicalInfo(caseId: string, data: {
    hospitalName?: string | null;
    doctorName?: string | null;
    admissionDate?: Date | null;
    injuryType?: string | null;
    medicalReportNo?: string | null;
    treatmentDetails?: string | null;
    severity?: string | null;
  }) {
    const info = await this.repository.addMedicalInfo(caseId, data);
    await activityService.logMedicalInfoAdded(caseId, info.doctorName || "Unknown");
    return info;
  }

  async updateMedicalInfo(id: string, data: {
    hospitalName?: string | null;
    doctorName?: string | null;
    admissionDate?: Date | null;
    injuryType?: string | null;
    medicalReportNo?: string | null;
    treatmentDetails?: string | null;
    severity?: string | null;
  }) {
    const info = await this.repository.updateMedicalInfo(id, data);
    await activityService.logMedicalInfoUpdated(info.caseId, info.doctorName || "Unknown");
    return info;
  }

  async deleteMedicalInfo(id: string) {
    const info = await prisma.medicalInformation.findUnique({ where: { id } });
    if (!info) throw new Error("Medical info not found");

    await this.repository.deleteMedicalInfo(id);
    await activityService.logMedicalInfoDeleted(info.caseId, info.doctorName || "Unknown");
    return info;
  }

  // --- Court Info ---
  async addCourtInfo(caseId: string, data: {
    courtName?: string | null;
    judgeName?: string | null;
    caseNumber?: string | null;
    nextHearingDate?: Date | null;
    chargesheetFiledDate?: Date | null;
    currentStatus?: string | null;
    judgementDetails?: string | null;
  }) {
    const info = await this.repository.addCourtInfo(caseId, data);
    await activityService.logCourtInfoAdded(caseId, info.caseNumber || "Unknown");
    return info;
  }

  async updateCourtInfo(id: string, data: {
    courtName?: string | null;
    judgeName?: string | null;
    caseNumber?: string | null;
    nextHearingDate?: Date | null;
    chargesheetFiledDate?: Date | null;
    currentStatus?: string | null;
    judgementDetails?: string | null;
  }) {
    const info = await this.repository.updateCourtInfo(id, data);
    await activityService.logCourtInfoUpdated(info.caseId, info.caseNumber || "Unknown");
    return info;
  }

  async deleteCourtInfo(id: string) {
    const info = await prisma.courtInformation.findUnique({ where: { id } });
    if (!info) throw new Error("Court info not found");

    await this.repository.deleteCourtInfo(id);
    await activityService.logCourtInfoDeleted(info.caseId, info.caseNumber || "Unknown");
    return info;
  }
}

export const investigationProfileService = new InvestigationProfileService();

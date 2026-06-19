import { prisma } from "@/lib/prisma";
import { PersonRole } from "@/generated/prisma/client";

export class InvestigationProfileRepository {
  // --- Investigation Profile ---
  async getProfile(caseId: string) {
    return prisma.investigationProfile.findUnique({
      where: { caseId },
    });
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
    return prisma.investigationProfile.upsert({
      where: { caseId },
      create: {
        caseId,
        ...data,
      },
      update: data,
    });
  }

  // --- Victims (Reusing Person) ---
  async findVictimById(id: string) {
    return prisma.victim.findUnique({
      where: { id },
      include: { person: true },
    });
  }

  async addVictim(caseId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    injuryDetails?: string | null;
    status?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          caseId,
          name: data.name,
          role: PersonRole.VICTIM,
          phone: data.phone,
          address: data.address,
          statement: data.statement,
          notes: data.notes,
        },
      });

      return tx.victim.create({
        data: {
          caseId,
          personId: person.id,
          injuryDetails: data.injuryDetails,
          status: data.status,
        },
        include: { person: true },
      });
    });
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
    const victim = await this.findVictimById(id);
    if (!victim) throw new Error("Victim not found");

    return prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: victim.personId },
        data: {
          name: data.name,
          phone: data.phone,
          address: data.address,
          statement: data.statement,
          notes: data.notes,
        },
      });

      return tx.victim.update({
        where: { id },
        data: {
          injuryDetails: data.injuryDetails,
          status: data.status,
        },
        include: { person: true },
      });
    });
  }

  async deleteVictim(id: string) {
    const victim = await this.findVictimById(id);
    if (!victim) throw new Error("Victim not found");

    // Deleting the person will cascade and delete the victim record
    return prisma.person.delete({
      where: { id: victim.personId },
    });
  }

  // --- Accused (Reusing Person) ---
  async findAccusedById(id: string) {
    return prisma.accused.findUnique({
      where: { id },
      include: { person: true },
    });
  }

  async addAccused(caseId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    arrestStatus?: string | null;
    bailDetails?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          caseId,
          name: data.name,
          role: PersonRole.SUSPECT,
          phone: data.phone,
          address: data.address,
          statement: data.statement,
          notes: data.notes,
        },
      });

      return tx.accused.create({
        data: {
          caseId,
          personId: person.id,
          arrestStatus: data.arrestStatus,
          bailDetails: data.bailDetails,
        },
        include: { person: true },
      });
    });
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
    const accused = await this.findAccusedById(id);
    if (!accused) throw new Error("Accused not found");

    return prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: accused.personId },
        data: {
          name: data.name,
          phone: data.phone,
          address: data.address,
          statement: data.statement,
          notes: data.notes,
        },
      });

      return tx.accused.update({
        where: { id },
        data: {
          arrestStatus: data.arrestStatus,
          bailDetails: data.bailDetails,
        },
        include: { person: true },
      });
    });
  }

  async deleteAccused(id: string) {
    const accused = await this.findAccusedById(id);
    if (!accused) throw new Error("Accused not found");

    return prisma.person.delete({
      where: { id: accused.personId },
    });
  }

  // --- Witnesses (Reusing Person) ---
  async findWitnessById(id: string) {
    return prisma.witness.findUnique({
      where: { id },
      include: { person: true },
    });
  }

  async addWitness(caseId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    statementDate?: Date | null;
    credibilityScore?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          caseId,
          name: data.name,
          role: PersonRole.WITNESS,
          phone: data.phone,
          address: data.address,
          statement: data.statement,
          notes: data.notes,
        },
      });

      return tx.witness.create({
        data: {
          caseId,
          personId: person.id,
          statementDate: data.statementDate,
          credibilityScore: data.credibilityScore,
        },
        include: { person: true },
      });
    });
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
    const witness = await this.findWitnessById(id);
    if (!witness) throw new Error("Witness not found");

    return prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: witness.personId },
        data: {
          name: data.name,
          phone: data.phone,
          address: data.address,
          statement: data.statement,
          notes: data.notes,
        },
      });

      return tx.witness.update({
        where: { id },
        data: {
          statementDate: data.statementDate,
          credibilityScore: data.credibilityScore,
        },
        include: { person: true },
      });
    });
  }

  async deleteWitness(id: string) {
    const witness = await this.findWitnessById(id);
    if (!witness) throw new Error("Witness not found");

    return prisma.person.delete({
      where: { id: witness.personId },
    });
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
    return prisma.vehicle.create({
      data: {
        caseId,
        ...data,
      },
    });
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
    return prisma.vehicle.update({
      where: { id },
      data,
    });
  }

  async deleteVehicle(id: string) {
    return prisma.vehicle.delete({
      where: { id },
    });
  }

  // --- SeizedItems ---
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
    return prisma.seizedItem.create({
      data: {
        caseId,
        ...data,
      },
    });
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
    return prisma.seizedItem.update({
      where: { id },
      data,
    });
  }

  async deleteSeizedItem(id: string) {
    return prisma.seizedItem.delete({
      where: { id },
    });
  }

  // --- MedicalInformation ---
  async addMedicalInfo(caseId: string, data: {
    hospitalName?: string | null;
    doctorName?: string | null;
    admissionDate?: Date | null;
    injuryType?: string | null;
    medicalReportNo?: string | null;
    treatmentDetails?: string | null;
    severity?: string | null;
  }) {
    return prisma.medicalInformation.create({
      data: {
        caseId,
        ...data,
      },
    });
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
    return prisma.medicalInformation.update({
      where: { id },
      data,
    });
  }

  async deleteMedicalInfo(id: string) {
    return prisma.medicalInformation.delete({
      where: { id },
    });
  }

  // --- CourtInformation ---
  async addCourtInfo(caseId: string, data: {
    courtName?: string | null;
    judgeName?: string | null;
    caseNumber?: string | null;
    nextHearingDate?: Date | null;
    chargesheetFiledDate?: Date | null;
    currentStatus?: string | null;
    judgementDetails?: string | null;
  }) {
    return prisma.courtInformation.create({
      data: {
        caseId,
        ...data,
      },
    });
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
    return prisma.courtInformation.update({
      where: { id },
      data,
    });
  }

  async deleteCourtInfo(id: string) {
    return prisma.courtInformation.delete({
      where: { id },
    });
  }
}

export const investigationProfileRepository = new InvestigationProfileRepository();

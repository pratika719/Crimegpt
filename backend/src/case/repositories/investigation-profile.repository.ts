import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PersonRole } from '@prisma/client';

@Injectable()
export class InvestigationProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async checkCaseOwnership(caseId: string, userId: string) {
    const c = await this.prisma.case.findFirst({
      where: { id: caseId, userId },
    });
    if (!c) {
      throw new UnauthorizedException('Unauthorized: Case not found or access denied.');
    }
  }

  private async checkVictimOwnership(id: string, userId: string) {
    const v = await this.prisma.victim.findFirst({
      where: { id, case: { userId } },
    });
    if (!v) {
      throw new UnauthorizedException('Unauthorized: Victim record access denied.');
    }
    return v;
  }

  private async checkAccusedOwnership(id: string, userId: string) {
    const a = await this.prisma.accused.findFirst({
      where: { id, case: { userId } },
    });
    if (!a) {
      throw new UnauthorizedException('Unauthorized: Accused record access denied.');
    }
    return a;
  }

  private async checkWitnessOwnership(id: string, userId: string) {
    const w = await this.prisma.witness.findFirst({
      where: { id, case: { userId } },
    });
    if (!w) {
      throw new UnauthorizedException('Unauthorized: Witness record access denied.');
    }
    return w;
  }

  private async checkVehicleOwnership(id: string, userId: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id, case: { userId } },
    });
    if (!v) {
      throw new UnauthorizedException('Unauthorized: Vehicle record access denied.');
    }
    return v;
  }

  private async checkSeizedItemOwnership(id: string, userId: string) {
    const s = await this.prisma.seizedItem.findFirst({
      where: { id, case: { userId } },
    });
    if (!s) {
      throw new UnauthorizedException('Unauthorized: Seized item record access denied.');
    }
    return s;
  }

  private async checkMedicalInfoOwnership(id: string, userId: string) {
    const m = await this.prisma.medicalInformation.findFirst({
      where: { id, case: { userId } },
    });
    if (!m) {
      throw new UnauthorizedException('Unauthorized: Medical information record access denied.');
    }
    return m;
  }

  private async checkCourtInfoOwnership(id: string, userId: string) {
    const c = await this.prisma.courtInformation.findFirst({
      where: { id, case: { userId } },
    });
    if (!c) {
      throw new UnauthorizedException('Unauthorized: Court information record access denied.');
    }
    return c;
  }

  // --- Investigation Profile ---
  async getProfile(caseId: string, userId: string) {
    await this.checkCaseOwnership(caseId, userId);
    return this.prisma.investigationProfile.findUnique({
      where: { caseId },
    });
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
    await this.checkCaseOwnership(caseId, userId);
    return this.prisma.investigationProfile.upsert({
      where: { caseId },
      create: {
        caseId,
        ...data,
      },
      update: data,
    });
  }

  // --- Victims ---
  async findVictimById(id: string, userId: string) {
    await this.checkVictimOwnership(id, userId);
    return this.prisma.victim.findUnique({
      where: { id },
      include: { person: true },
    });
  }

  async addVictim(caseId: string, userId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    injuryDetails?: string | null;
    status?: string | null;
  }) {
    await this.checkCaseOwnership(caseId, userId);
    return this.prisma.$transaction(async (tx) => {
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

  async updateVictim(id: string, userId: string, data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    injuryDetails?: string | null;
    status?: string | null;
  }) {
    const victim = await this.checkVictimOwnership(id, userId);

    return this.prisma.$transaction(async (tx) => {
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

  async deleteVictim(id: string, userId: string) {
    const victim = await this.checkVictimOwnership(id, userId);
    return this.prisma.person.delete({
      where: { id: victim.personId },
    });
  }

  // --- Accused ---
  async findAccusedById(id: string, userId: string) {
    await this.checkAccusedOwnership(id, userId);
    return this.prisma.accused.findUnique({
      where: { id },
      include: { person: true },
    });
  }

  async addAccused(caseId: string, userId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    arrestStatus?: string | null;
    bailDetails?: string | null;
  }) {
    await this.checkCaseOwnership(caseId, userId);
    return this.prisma.$transaction(async (tx) => {
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

  async updateAccused(id: string, userId: string, data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    arrestStatus?: string | null;
    bailDetails?: string | null;
  }) {
    const accused = await this.checkAccusedOwnership(id, userId);

    return this.prisma.$transaction(async (tx) => {
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

  async deleteAccused(id: string, userId: string) {
    const accused = await this.checkAccusedOwnership(id, userId);
    return this.prisma.person.delete({
      where: { id: accused.personId },
    });
  }

  // --- Witnesses ---
  async findWitnessById(id: string, userId: string) {
    await this.checkWitnessOwnership(id, userId);
    return this.prisma.witness.findUnique({
      where: { id },
      include: { person: true },
    });
  }

  async addWitness(caseId: string, userId: string, data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    statementDate?: Date | null;
    credibilityScore?: string | null;
  }) {
    await this.checkCaseOwnership(caseId, userId);
    return this.prisma.$transaction(async (tx) => {
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

  async updateWitness(id: string, userId: string, data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    statement?: string | null;
    notes?: string | null;
    statementDate?: Date | null;
    credibilityScore?: string | null;
  }) {
    const witness = await this.checkWitnessOwnership(id, userId);

    return this.prisma.$transaction(async (tx) => {
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

  async deleteWitness(id: string, userId: string) {
    const witness = await this.checkWitnessOwnership(id, userId);
    return this.prisma.person.delete({
      where: { id: witness.personId },
    });
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
    await this.checkCaseOwnership(caseId, userId);
    return this.prisma.vehicle.create({
      data: {
        caseId,
        ...data,
      },
    });
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
    await this.checkVehicleOwnership(id, userId);
    return this.prisma.vehicle.update({
      where: { id },
      data,
    });
  }

  async deleteVehicle(id: string, userId: string) {
    await this.checkVehicleOwnership(id, userId);
    return this.prisma.vehicle.delete({
      where: { id },
    });
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
    await this.checkCaseOwnership(caseId, userId);
    return this.prisma.seizedItem.create({
      data: {
        caseId,
        ...data,
      },
    });
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
    await this.checkSeizedItemOwnership(id, userId);
    return this.prisma.seizedItem.update({
      where: { id },
      data,
    });
  }

  async deleteSeizedItem(id: string, userId: string) {
    await this.checkSeizedItemOwnership(id, userId);
    return this.prisma.seizedItem.delete({
      where: { id },
    });
  }

  // --- Medical Information ---
  async addMedicalInfo(caseId: string, userId: string, data: {
    hospitalName?: string | null;
    doctorName?: string | null;
    admissionDate?: Date | null;
    injuryType?: string | null;
    medicalReportNo?: string | null;
    treatmentDetails?: string | null;
    severity?: string | null;
  }) {
    await this.checkCaseOwnership(caseId, userId);
    return this.prisma.medicalInformation.create({
      data: {
        caseId,
        ...data,
      },
    });
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
    await this.checkMedicalInfoOwnership(id, userId);
    return this.prisma.medicalInformation.update({
      where: { id },
      data,
    });
  }

  async deleteMedicalInfo(id: string, userId: string) {
    await this.checkMedicalInfoOwnership(id, userId);
    return this.prisma.medicalInformation.delete({
      where: { id },
    });
  }

  // --- Court Information ---
  async addCourtInfo(caseId: string, userId: string, data: {
    courtName?: string | null;
    judgeName?: string | null;
    caseNumber?: string | null;
    nextHearingDate?: Date | null;
    chargesheetFiledDate?: Date | null;
    currentStatus?: string | null;
    judgementDetails?: string | null;
  }) {
    await this.checkCaseOwnership(caseId, userId);
    return this.prisma.courtInformation.create({
      data: {
        caseId,
        ...data,
      },
    });
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
    await this.checkCourtInfoOwnership(id, userId);
    return this.prisma.courtInformation.update({
      where: { id },
      data,
    });
  }

  async deleteCourtInfo(id: string, userId: string) {
    await this.checkCourtInfoOwnership(id, userId);
    return this.prisma.courtInformation.delete({
      where: { id },
    });
  }
}

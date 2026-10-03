import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';

// ---------------------------------------------------------------------------
// UnifiedCaseContext — the single data structure that all AI chains and
// prompt builders consume.  It flattens the relational Prisma model into
// a document-friendly shape.
// ---------------------------------------------------------------------------

export interface UnifiedCaseContext {
  caseId: string;
  title: string;
  narrative: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
  investigationProfile: {
    firNumber: string | null;
    policeStation: string | null;
    investigatingOfficer: string | null;
    dateOfRegistration: Date | null;
    incidentDateTime: Date | null;
    incidentLocation: string | null;
    incidentDescription: string | null;
    investigationNotes: string | null;
  } | null;
  persons: Array<{
    id: string;
    name: string;
    role: string;
    phone: string | null;
    address: string | null;
    statement: string | null;
    notes: string | null;
    createdAt: Date;
  }>;
  victims: Array<{
    id: string;
    personId: string;
    name: string;
    phone: string | null;
    address: string | null;
    statement: string | null;
    injuryDetails: string | null;
    status: string | null;
  }>;
  accused: Array<{
    id: string;
    personId: string;
    name: string;
    phone: string | null;
    address: string | null;
    statement: string | null;
    arrestStatus: string | null;
    bailDetails: string | null;
  }>;
  witnesses: Array<{
    id: string;
    personId: string;
    name: string;
    phone: string | null;
    address: string | null;
    statement: string | null;
    statementDate: Date | null;
    credibilityScore: string | null;
  }>;
  vehicles: Array<{
    id: string;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    licensePlate: string | null;
    registrationState: string | null;
    ownerName: string | null;
    seizureStatus: string | null;
    notes: string | null;
  }>;
  seizedItems: Array<{
    id: string;
    itemName: string;
    description: string | null;
    serialNumber: string | null;
    seizureLocation: string | null;
    seizureDate: Date | null;
    officerInCharge: string | null;
    storageLocation: string | null;
    status: string | null;
  }>;
  medicalInfos: Array<{
    id: string;
    hospitalName: string | null;
    doctorName: string | null;
    admissionDate: Date | null;
    injuryType: string | null;
    medicalReportNo: string | null;
    treatmentDetails: string | null;
    severity: string | null;
  }>;
  courtInfos: Array<{
    id: string;
    courtName: string | null;
    judgeName: string | null;
    caseNumber: string | null;
    nextHearingDate: Date | null;
    chargesheetFiledDate: Date | null;
    currentStatus: string | null;
    judgementDetails: string | null;
  }>;
  evidence: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    notes: string | null;
    fileUrl: string | null;
  }>;
  checklist: Array<{
    id: string;
    title: string;
    completed: boolean;
    completedAt: Date | null;
  }>;
  documents: Array<{
    id: string;
    type: string;
    title: string;
    content: unknown;
    version: number;
    createdAt: Date;
  }>;
  activities: Array<{
    id: string;
    activityType: string;
    description: string;
    createdAt: Date;
  }>;
}

// ---------------------------------------------------------------------------
// UnifiedContextService
// ---------------------------------------------------------------------------

@Injectable()
export class UnifiedContextService {
  private readonly logger = new Logger(UnifiedContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build the full unified context for a case.
   *
   * This is the heaviest single query in the system — it joins ~15 tables.
   * The result is consumed by all AI chains and prompt builders.
   */
  async buildUnifiedCaseContext(
    caseId: string,
    userId: string,
  ): Promise<UnifiedCaseContext> {
    const caseItem = await this.prisma.case.findFirst({
      where: { id: caseId, userId },
      include: {
        caseMetadata: true,
        investigationProfile: true,
        persons: { orderBy: { createdAt: 'desc' } },
        victims: { include: { person: true }, orderBy: { createdAt: 'desc' } },
        accused: { include: { person: true }, orderBy: { createdAt: 'desc' } },
        witnesses: { include: { person: true }, orderBy: { createdAt: 'desc' } },
        vehicles: { orderBy: { createdAt: 'desc' } },
        seizedItems: { orderBy: { createdAt: 'desc' } },
        medicalInformation: { orderBy: { createdAt: 'desc' } },
        courtInformation: { orderBy: { createdAt: 'desc' } },
        evidence: { orderBy: { createdAt: 'desc' } },
        checklistItems: { orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }] },
        generatedDocuments: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!caseItem) {
      throw new Error(`Case not found for ID: ${caseId}`);
    }

    return {
      caseId: caseItem.id,
      title: caseItem.title,
      narrative: caseItem.narrative,
      status: caseItem.status,
      createdAt: caseItem.createdAt,
      updatedAt: caseItem.updatedAt,
      metadata: (caseItem.caseMetadata as Record<string, unknown>) ?? {},
      investigationProfile: caseItem.investigationProfile
        ? {
            firNumber: caseItem.investigationProfile.firNumber,
            policeStation: caseItem.investigationProfile.policeStation,
            investigatingOfficer: caseItem.investigationProfile.investigatingOfficer,
            dateOfRegistration: caseItem.investigationProfile.dateOfRegistration,
            incidentDateTime: caseItem.investigationProfile.incidentDateTime,
            incidentLocation: caseItem.investigationProfile.incidentLocation,
            incidentDescription: caseItem.investigationProfile.incidentDescription,
            investigationNotes: caseItem.investigationProfile.investigationNotes,
          }
        : null,
      persons: caseItem.persons.map((p: any) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        phone: p.phone,
        address: p.address,
        statement: p.statement,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
      victims: caseItem.victims.map((v: any) => ({
        id: v.id,
        personId: v.personId,
        name: v.person.name,
        phone: v.person.phone,
        address: v.person.address,
        statement: v.person.statement,
        injuryDetails: v.injuryDetails,
        status: v.status,
      })),
      accused: caseItem.accused.map((a: any) => ({
        id: a.id,
        personId: a.personId,
        name: a.person.name,
        phone: a.person.phone,
        address: a.person.address,
        statement: a.person.statement,
        arrestStatus: a.arrestStatus,
        bailDetails: a.bailDetails,
      })),
      witnesses: caseItem.witnesses.map((w: any) => ({
        id: w.id,
        personId: w.personId,
        name: w.person.name,
        phone: w.person.phone,
        address: w.person.address,
        statement: w.person.statement,
        statementDate: w.statementDate,
        credibilityScore: w.credibilityScore,
      })),
      vehicles: caseItem.vehicles.map((vh: any) => ({
        id: vh.id,
        make: vh.make,
        model: vh.model,
        year: vh.year,
        color: vh.color,
        licensePlate: vh.licensePlate,
        registrationState: vh.registrationState,
        ownerName: vh.ownerName,
        seizureStatus: vh.seizureStatus,
        notes: vh.notes,
      })),
      seizedItems: caseItem.seizedItems.map((si: any) => ({
        id: si.id,
        itemName: si.itemName,
        description: si.description,
        serialNumber: si.serialNumber,
        seizureLocation: si.seizureLocation,
        seizureDate: si.seizureDate,
        officerInCharge: si.officerInCharge,
        storageLocation: si.storageLocation,
        status: si.status,
      })),
      medicalInfos: caseItem.medicalInformation.map((mi: any) => ({
        id: mi.id,
        hospitalName: mi.hospitalName,
        doctorName: mi.doctorName,
        admissionDate: mi.admissionDate,
        injuryType: mi.injuryType,
        medicalReportNo: mi.medicalReportNo,
        treatmentDetails: mi.treatmentDetails,
        severity: mi.severity,
      })),
      courtInfos: caseItem.courtInformation.map((ci: any) => ({
        id: ci.id,
        courtName: ci.courtName,
        judgeName: ci.judgeName,
        caseNumber: ci.caseNumber,
        nextHearingDate: ci.nextHearingDate,
        chargesheetFiledDate: ci.chargesheetFiledDate,
        currentStatus: ci.currentStatus,
        judgementDetails: ci.judgementDetails,
      })),
      evidence: caseItem.evidence.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: e.type,
        notes: e.notes,
        fileUrl: e.fileUrl,
      })),
      checklist: caseItem.checklistItems.map((c: any) => ({
        id: c.id,
        title: c.title,
        completed: c.completed,
        completedAt: c.completedAt,
      })),
      documents: caseItem.generatedDocuments.map((d: any) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        content: d.content,
        version: d.version,
        createdAt: d.createdAt,
      })),
      activities: caseItem.activities.map((a: any) => ({
        id: a.id,
        activityType: a.activityType,
        description: a.description,
        createdAt: a.createdAt,
      })),
    };
  }
}

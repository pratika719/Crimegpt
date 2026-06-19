import { CaseRepository } from "@/repositories/case.repository";

export interface UnifiedCaseContext {
  caseId: string;
  title: string;
  narrative: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: any;
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
    content: any;
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

export class UnifiedContextService {
  private caseRepository = new CaseRepository();

  async buildUnifiedCaseContext(caseId: string): Promise<UnifiedCaseContext> {
    const caseItem = await this.caseRepository.findById(caseId);
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
      metadata: caseItem.metadata,
      investigationProfile: caseItem.investigationProfile || null,
      persons: caseItem.persons.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        phone: p.phone,
        address: p.address,
        statement: p.statement,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
      victims: (caseItem.victims || []).map((v) => ({
        id: v.id,
        personId: v.personId,
        name: v.person.name,
        phone: v.person.phone,
        address: v.person.address,
        statement: v.person.statement,
        injuryDetails: v.injuryDetails,
        status: v.status,
      })),
      accused: (caseItem.accused || []).map((a) => ({
        id: a.id,
        personId: a.personId,
        name: a.person.name,
        phone: a.person.phone,
        address: a.person.address,
        statement: a.person.statement,
        arrestStatus: a.arrestStatus,
        bailDetails: a.bailDetails,
      })),
      witnesses: (caseItem.witnesses || []).map((w) => ({
        id: w.id,
        personId: w.personId,
        name: w.person.name,
        phone: w.person.phone,
        address: w.person.address,
        statement: w.person.statement,
        statementDate: w.statementDate,
        credibilityScore: w.credibilityScore,
      })),
      vehicles: (caseItem.vehicles || []).map((vh) => ({
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
      seizedItems: (caseItem.seizedItems || []).map((si) => ({
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
      medicalInfos: (caseItem.medicalInfos || []).map((mi) => ({
        id: mi.id,
        hospitalName: mi.hospitalName,
        doctorName: mi.doctorName,
        admissionDate: mi.admissionDate,
        injuryType: mi.injuryType,
        medicalReportNo: mi.medicalReportNo,
        treatmentDetails: mi.treatmentDetails,
        severity: mi.severity,
      })),
      courtInfos: (caseItem.courtInfos || []).map((ci) => ({
        id: ci.id,
        courtName: ci.courtName,
        judgeName: ci.judgeName,
        caseNumber: ci.caseNumber,
        nextHearingDate: ci.nextHearingDate,
        chargesheetFiledDate: ci.chargesheetFiledDate,
        currentStatus: ci.currentStatus,
        judgementDetails: ci.judgementDetails,
      })),
      evidence: caseItem.evidence.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: e.type,
        notes: e.notes,
        fileUrl: e.fileUrl,
      })),
      checklist: caseItem.checklist.map((c) => ({
        id: c.id,
        title: c.title,
        completed: c.completed,
        completedAt: c.completedAt,
      })),
      documents: caseItem.documents.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        content: d.content,
        version: d.version,
        createdAt: d.createdAt,
      })),
      activities: caseItem.activities.map((a) => ({
        id: a.id,
        activityType: a.activityType,
        description: a.description,
        createdAt: a.createdAt,
      })),
    };
  }
}

export const unifiedContextService = new UnifiedContextService();

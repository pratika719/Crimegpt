import { DocumentType } from "@/generated/prisma/client";

export const validFIRCaseId = "case_diagnostic_fir_001";
export const validFIRUserId = "user_diagnostic_fir_001";
export const validFIRRequestId = "generation_diagnostic_fir_001";

export const validFIRContext = {
  caseId: validFIRCaseId,
  title: "Diagnostic FIR case",
  narrative: "On 2026-07-01 the complainant reported that a mobile phone was taken from her bag at Market Road.",
  status: "OPEN",
  createdAt: new Date("2026-07-01T10:00:00.000Z"),
  updatedAt: new Date("2026-07-01T10:00:00.000Z"),
  metadata: {},
  investigationProfile: {
    firNumber: "FIR-001/2026",
    policeStation: "Market Road Police Station",
    investigatingOfficer: "Inspector Rao",
    dateOfRegistration: new Date("2026-07-01T10:00:00.000Z"),
    incidentDateTime: new Date("2026-07-01T09:30:00.000Z"),
    incidentLocation: "Market Road, Pune",
    incidentDescription: "Reported theft of a mobile phone.",
    investigationNotes: null,
  },
  persons: [{
    id: "person_victim_001",
    name: "Anita Sharma",
    role: "VICTIM",
    phone: null,
    address: "Pune",
    statement: "My phone was taken from my bag.",
    notes: null,
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
  }],
  victims: [{
    id: "victim_001",
    personId: "person_victim_001",
    name: "Anita Sharma",
    phone: null,
    address: "Pune",
    statement: "My phone was taken from my bag.",
    injuryDetails: null,
    status: "Stable",
  }],
  accused: [],
  witnesses: [],
  vehicles: [],
  seizedItems: [],
  medicalInfos: [],
  courtInfos: [],
  evidence: [],
  checklist: [],
  documents: [],
  activities: [],
};

export const validFIROutput = {
  complaintSummary: "The complainant reported the theft of her mobile phone from a bag at Market Road.",
  incidentDate: "2026-07-01 09:30",
  incidentLocation: "Market Road, Pune",
  suspectedOffenses: ["Theft"],
  applicableSections: [{
    section: "IPC_379",
    reason: "The supplied facts allege dishonest removal of a mobile phone without consent.",
  }],
  factsOfCase: "Anita Sharma reported that an unknown person removed her mobile phone from her bag at Market Road on 1 July 2026.",
  investigationDirections: "Record the complainant statement, obtain CCTV footage, and identify possible witnesses.",
  officerRemarks: "FIR recorded for investigation subject to verification of the supplied facts.",
};

export const validFIRDocumentInput = {
  caseId: validFIRCaseId,
  userId: validFIRUserId,
  documentType: DocumentType.FIR,
  requestId: validFIRRequestId,
};

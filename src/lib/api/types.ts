export type CaseStatus = 'OPEN' | 'UNDER_INVESTIGATION' | 'CLOSED' | 'ARCHIVED';

export type DocumentType =
  | 'FIR'
  | 'LEGAL_ANALYSIS'
  | 'INVESTIGATION_SUMMARY'
  | 'CHARGE_SHEET'
  | 'CASE_DIARY'
  | 'REMAND_REQUEST'
  | 'AI_DIAGNOSTICS';

export type PersonRole =
  | 'SUSPECT'
  | 'VICTIM'
  | 'WITNESS'
  | 'OFFICER'
  | 'PERSON_OF_INTEREST'
  | 'INFORMANT';

export interface CaseSummary {
  id: string;
  title: string;
  narrative: string;
  status: CaseStatus;
  userId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface GeneratedDocument {
  id: string;
  caseId: string;
  type: DocumentType;
  title: string;
  content: any;
  version: number;
  createdAt: string | Date;
  updatedAt?: string | Date;
  caseTitle?: string;
}

export interface CaseActivity {
  id: string;
  caseId: string;
  userId: string;
  activityType: string;
  description: string;
  metadata?: any;
  createdAt: string | Date;
}

export interface CaseMetadata {
  id: string;
  caseId: string;
  incidentDate?: string | Date | null;
  incidentTime?: string | null;
  incidentLocation?: string | null;
  victimName?: string | null;
  victimStatement?: string | null;
  suspectName?: string | null;
  suspectDescription?: string | null;
  witnessInformation?: string | null;
  evidenceSummary?: string | null;
  officerNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Person {
  id: string;
  caseId: string;
  name: string;
  role: PersonRole;
  phone?: string | null;
  address?: string | null;
  statement?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Evidence {
  id: string;
  caseId: string;
  title: string;
  type: string;
  description?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
  metadata?: any;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ChecklistItem {
  id: string;
  caseId: string;
  userId: string;
  title: string;
  completed: boolean;
  completedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface InvestigationProfile {
  id: string;
  caseId: string;
  firNumber?: string | null;
  policeStation?: string | null;
  investigatingOfficer?: string | null;
  dateOfRegistration?: string | Date | null;
  incidentDateTime?: string | Date | null;
  incidentLocation?: string | null;
  incidentDescription?: string | null;
  investigationNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Victim {
  id: string;
  caseId: string;
  personId: string;
  injuryDetails?: string | null;
  status?: string | null;
  person: Person;
}

export interface Accused {
  id: string;
  caseId: string;
  personId: string;
  arrestStatus?: string | null;
  bailDetails?: string | null;
  person: Person;
}

export interface Witness {
  id: string;
  caseId: string;
  personId: string;
  statementDate?: string | Date | null;
  credibilityScore?: string | null;
  person: Person;
}

export interface Vehicle {
  id: string;
  caseId: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  licensePlate?: string | null;
  registrationState?: string | null;
  ownerName?: string | null;
  seizureStatus?: string | null;
  notes?: string | null;
  createdAt: string | Date;
}

export interface SeizedItem {
  id: string;
  caseId: string;
  itemName: string;
  description?: string | null;
  serialNumber?: string | null;
  seizureLocation?: string | null;
  seizureDate?: string | Date | null;
  officerInCharge?: string | null;
  storageLocation?: string | null;
  status?: string | null;
  createdAt: string | Date;
}

export interface MedicalInformation {
  id: string;
  caseId: string;
  hospitalName?: string | null;
  doctorName?: string | null;
  admissionDate?: string | Date | null;
  injuryType?: string | null;
  medicalReportNo?: string | null;
  treatmentDetails?: string | null;
  severity?: string | null;
  createdAt: string | Date;
}

export interface CourtInformation {
  id: string;
  caseId: string;
  courtName?: string | null;
  judgeName?: string | null;
  caseNumber?: string | null;
  nextHearingDate?: string | Date | null;
  chargesheetFiledDate?: string | Date | null;
  currentStatus?: string | null;
  judgementDetails?: string | null;
  createdAt: string | Date;
}

export interface CaseDetail extends CaseSummary {
  caseMetadata?: CaseMetadata | null;
  persons: Person[];
  evidence: Evidence[];
  checklistItems: ChecklistItem[];
  activities: CaseActivity[];
  generatedDocuments: GeneratedDocument[];
  investigationProfile?: InvestigationProfile | null;
  victims: Victim[];
  accused: Accused[];
  witnesses: Witness[];
  vehicles: Vehicle[];
  seizedItems: SeizedItem[];
  medicalInformation: MedicalInformation[];
  courtInformation: CourtInformation[];
  aiRequestLogs?: any[];
}

export type MinimalJobState = 'pending' | 'active' | 'completed' | 'failed' | 'unknown';

export interface JobStatusResponse {
  queueName: string;
  jobId: string;
  state: MinimalJobState;
  status?: string;
  failedReason?: string | null;
  errorCode?: string | null;
  failureType?: string | null;
  documentId?: string | null;
  result?: any;
  progress?: number;
  error?: string;
  message?: string;
}

export interface SearchResultDTO {
  id: string;
  type: 'CASE' | 'DOCUMENT' | 'EVIDENCE' | 'PERSON' | 'ACTIVITY' | 'PROFILE';
  title: string;
  subtitle: string;
  description: string;
  url: string;
  badge?: string;
  createdAt: string;
}

export type AuditSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'HIGH';
export type AuditModule = 'CASE' | 'DOCUMENT' | 'PERSON' | 'EVIDENCE' | 'CHECKLIST' | 'PROFILE' | 'DIAGNOSTICS' | 'SYSTEM';

export interface EnrichedActivity {
  id: string;
  activityType: string;
  description: string;
  metadata: any;
  createdAt: Date | string;
  caseId: string;
  caseTitle: string;
  severity: AuditSeverity;
  module: AuditModule;
  isAi: boolean;
}

export interface AuditDashboardStats {
  totalCount: number;
  aiCount: number;
  severeCount: number;
  userCount: number;
}

export interface AuditLogFilters {
  caseId?: string;
  module?: string;
  severity?: string;
  isAi?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Define DocumentType locally to avoid importing the database/server-only Prisma Client runtime in client bundles.
export enum DocumentType {
  FIR = "FIR",
  INVESTIGATION_SUMMARY = "INVESTIGATION_SUMMARY",
  CHARGE_SHEET = "CHARGE_SHEET",
  REMAND_REQUEST = "REMAND_REQUEST",
  CASE_DIARY = "CASE_DIARY",
  LEGAL_ANALYSIS = "LEGAL_ANALYSIS",
}

export type TemplateElementType = 
  | "METADATA_BOX" 
  | "TEXT_SECTION" 
  | "LINED_NARRATIVE" 
  | "BADGE_GRID" 
  | "OBJECT_TABLE" 
  | "BULLET_LIST" 
  | "ITALIC_BLOCK";

export interface TemplateElement {
  key: string;            // The key in the document JSON (e.g., 'complaintSummary')
  title: string;          // The section heading to display in the PDF
  type: TemplateElementType;
  columns?: string[];     // Optional column header keys for OBJECT_TABLE
  columnLabels?: string[]; // Optional column display headers for OBJECT_TABLE
}

export interface DocumentTemplateConfig {
  type: DocumentType;
  title: string;
  subTitle: string;
  stampText: string;
  elements: TemplateElement[];
}

export class DocumentTemplateRegistry {
  private static templates = new Map<DocumentType, DocumentTemplateConfig>();

  public static register(config: DocumentTemplateConfig) {
    this.templates.set(config.type, config);
  }

  public static getTemplate(type: any): DocumentTemplateConfig {
    const config = this.templates.get(type as DocumentType);
    if (!config) {
      // Fallback template for any new/unregistered documents
      return {
        type,
        title: `${type.replace(/_/g, " ")} Document`,
        subTitle: "CrimeGPT Investigation Records",
        stampText: "FOR OFFICIAL USE ONLY",
        elements: []
      };
    }
    return config;
  }
}

// Register FIR Template
DocumentTemplateRegistry.register({
  type: DocumentType.FIR,
  title: "FIRST INFORMATION REPORT",
  subTitle: "FORMAL POLICE RECORD (UNDER SEC 154 CrPC)",
  stampText: "LAW ENFORCEMENT ONLY",
  elements: [
    { key: "incidentDate", title: "Date & Time of Occurrence", type: "TEXT_SECTION" },
    { key: "incidentLocation", title: "Place of Occurrence", type: "TEXT_SECTION" },
    { key: "complaintSummary", title: "1. Abstract of Complaint", type: "TEXT_SECTION" },
    { key: "suspectedOffenses", title: "2. Suspected Offenses", type: "BADGE_GRID" },
    { 
      key: "applicableSections", 
      title: "3. Applicable Law Sections", 
      type: "OBJECT_TABLE",
      columns: ["section", "reason"],
      columnLabels: ["Section Code", "Applicability Justification"]
    },
    { key: "factsOfCase", title: "4. Chronological Facts of Case", type: "LINED_NARRATIVE" },
    { key: "investigationDirections", title: "5. Preliminary Investigation Directions", type: "TEXT_SECTION" },
    { key: "officerRemarks", title: "6. SHO Remarks & Endorsement", type: "ITALIC_BLOCK" }
  ]
});

// Register Investigation Summary Template
DocumentTemplateRegistry.register({
  type: DocumentType.INVESTIGATION_SUMMARY,
  title: "INVESTIGATION SUMMARY REPORT",
  subTitle: "OFFICIAL BRIEFING RECORD",
  stampText: "RESTRICTED",
  elements: [
    { key: "executiveSummary", title: "1. Executive Summary", type: "TEXT_SECTION" },
    { key: "incidentOverview", title: "2. Incident Overview & Timeline", type: "TEXT_SECTION" },
    { key: "factsEstablished", title: "3. Facts Established", type: "LINED_NARRATIVE" },
    { 
      key: "applicableSections", 
      title: "4. Applicable Law Sections", 
      type: "OBJECT_TABLE",
      columns: ["section", "reason"],
      columnLabels: ["Section Code", "Applicability Justification"]
    },
    { key: "evidenceAssessment", title: "5. Evidence Assessment", type: "TEXT_SECTION" },
    { key: "personsInvolved", title: "6. Persons Involved Summary", type: "LINED_NARRATIVE" },
    { key: "investigationFindings", title: "7. Detailed Inquest Findings", type: "TEXT_SECTION" },
    { key: "potentialGaps", title: "8. Investigation Gaps / Discrepancies", type: "TEXT_SECTION" },
    { key: "recommendedNextSteps", title: "9. Immediate Actions Recommended", type: "TEXT_SECTION" },
    { key: "conclusion", title: "10. Conclusion & Legal Opinion", type: "ITALIC_BLOCK" }
  ]
});

// Register Charge Sheet Template
DocumentTemplateRegistry.register({
  type: DocumentType.CHARGE_SHEET,
  title: "PROSECUTION CHARGE SHEET",
  subTitle: "FINAL POLICE REPORT (UNDER SEC 173 CrPC / SEC 193 BNSS)",
  stampText: "SUBMISSION TO COURT ONLY",
  elements: [
    { key: "caseDetails", title: "Police Case Details", type: "METADATA_BOX" },
    { 
      key: "accusedList", 
      title: "1. Details of Accused Persons", 
      type: "OBJECT_TABLE",
      columns: ["name", "arrestStatus", "applicableSections", "evidenceLinks"],
      columnLabels: ["Accused Name", "Arrest/Bail Status", "Sections", "Evidence Connecting Accused"]
    },
    { key: "briefFacts", title: "2. Chronological Facts of Case", type: "LINED_NARRATIVE" },
    { key: "evidenceCollected", title: "3. Classified Evidence Collected", type: "METADATA_BOX" },
    { 
      key: "witnessStatements", 
      title: "4. Witness Statements Summary", 
      type: "OBJECT_TABLE",
      columns: ["name", "summaryOfStatement", "credibilityScore"],
      columnLabels: ["Witness Name", "Recorded Statement Abstract", "Credibility"]
    },
    { key: "finalConclusion", title: "5. Final Inquest Conclusion", type: "TEXT_SECTION" },
    { key: "officerRemarks", title: "6. SHO Endorsement & Remarks", type: "ITALIC_BLOCK" }
  ]
});

// Register Remand Request Template
DocumentTemplateRegistry.register({
  type: DocumentType.REMAND_REQUEST,
  title: "ACCUSED REMAND APPLICATION",
  subTitle: "CUSTODY PETITION TO MAGISTRATE COURT (UNDER SEC 167 CrPC / SEC 187 BNSS)",
  stampText: "SUBMISSION TO COURT ONLY",
  elements: [
    { key: "caseDetails", title: "Police Case Details", type: "METADATA_BOX" },
    { key: "custodyRequested", title: "Detention Custody Requested", type: "METADATA_BOX" },
    { 
      key: "accusedDetails", 
      title: "1. Accused Subject to Remand", 
      type: "OBJECT_TABLE",
      columns: ["name", "arrestDateTime", "currentCustodyStatus"],
      columnLabels: ["Accused Name", "Arrest Timestamp", "Current Custody Status"]
    },
    { key: "groundsForRemand", title: "2. Grounds for Remand Custody", type: "BULLET_LIST" },
    { key: "investigationProgress", title: "3. Investigation Progress Summary", type: "LINED_NARRATIVE" },
    { key: "officerRemarks", title: "4. IO Remarks & Certification", type: "ITALIC_BLOCK" }
  ]
});

// Register Case Diary Template
DocumentTemplateRegistry.register({
  type: DocumentType.CASE_DIARY,
  title: "INVESTIGATION CASE DIARY",
  subTitle: "DAILY CASE LOG (UNDER SEC 172 CrPC / SEC 186 BNSS)",
  stampText: "OFFICIAL USE ONLY",
  elements: [
    { key: "caseDetails", title: "Police Case Details", type: "METADATA_BOX" },
    { key: "diaryDate", title: "Diary Entry Date", type: "TEXT_SECTION" },
    { key: "investigatingOfficer", title: "Investigating Officer", type: "TEXT_SECTION" },
    { key: "narrativeDiary", title: "Daily Narrative Case Diary Record", type: "LINED_NARRATIVE" },
    { key: "nextSteps", title: "Action Items & Next Steps", type: "BULLET_LIST" }
  ]
});

// Register Legal Analysis Template
DocumentTemplateRegistry.register({
  type: DocumentType.LEGAL_ANALYSIS,
  title: "AI LEGAL ANALYSIS REPORT",
  subTitle: "CRIMINAL CASE EVALUATION REPORT",
  stampText: "RESTRICTED",
  elements: [
    { key: "confidence", title: "AI Analysis Confidence Score", type: "TEXT_SECTION" },
    { key: "summary", title: "1. Incident Summary Abstract", type: "TEXT_SECTION" },
    { 
      key: "applicableSections", 
      title: "2. Applicable Law Sections", 
      type: "OBJECT_TABLE",
      columns: ["section", "reason"],
      columnLabels: ["Section Code", "Applicability Justification"]
    },
    { key: "reasoning", title: "3. Detailed Legal Reasoning", type: "LINED_NARRATIVE" }
  ]
});

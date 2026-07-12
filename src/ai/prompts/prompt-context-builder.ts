import { UnifiedCaseContext } from "@/services/case/unified-context.service";

/**
 * Utility to format the UnifiedCaseContext relational lists into structured text blocks
 * suitable for embedding in LLM prompts.
 */
export function formatUnifiedContextForPrompt(
  context: UnifiedCaseContext,
  options: { includeActivities?: boolean } = {},
): string {
  const profile = context.investigationProfile;
  const policeInfo = profile 
    ? `- Police Station: ${profile.policeStation || "Not Specified"}
- Investigating Officer: ${profile.investigatingOfficer || "Not Specified"}
- FIR Number: ${profile.firNumber || "Not Specified"}
- Date of Registration: ${profile.dateOfRegistration ? new Date(profile.dateOfRegistration).toLocaleDateString() : "Not Specified"}`
    : "Not Specified";

  const incidentInfo = profile
    ? `- Incident Date/Time: ${profile.incidentDateTime ? new Date(profile.incidentDateTime).toLocaleString() : "Not Specified"}
- Incident Location: ${profile.incidentLocation || "Not Specified"}
- Incident Description: ${profile.incidentDescription || "Not Specified"}`
    : "Not Specified";

  const victimsList = context.victims.length > 0
    ? context.victims.map((v, i) => `Victim ${i+1}:
- Name: ${v.name}
- Phone: ${v.phone || "Not Specified"}
- Address: ${v.address || "Not Specified"}
- Statement: ${v.statement || "Not Specified"}
- Injury Details: ${v.injuryDetails || "Not Specified"}
- Status: ${v.status || "Not Specified"}`).join("\n\n")
    : "None recorded.";

  const accusedList = context.accused.length > 0
    ? context.accused.map((a, i) => `Accused ${i+1}:
- Name: ${a.name}
- Phone: ${a.phone || "Not Specified"}
- Address: ${a.address || "Not Specified"}
- Statement: ${a.statement || "Not Specified"}
- Arrest Status: ${a.arrestStatus || "Not Specified"}
- Bail Details: ${a.bailDetails || "Not Specified"}`).join("\n\n")
    : "None recorded.";

  const witnessesList = context.witnesses.length > 0
    ? context.witnesses.map((w, i) => `Witness ${i+1}:
- Name: ${w.name}
- Phone: ${w.phone || "Not Specified"}
- Address: ${w.address || "Not Specified"}
- Statement: ${w.statement || "Not Specified"}
- Statement Date: ${w.statementDate ? new Date(w.statementDate).toLocaleDateString() : "Not Specified"}
- Credibility: ${w.credibilityScore || "Not Specified"}`).join("\n\n")
    : "None recorded.";

  const vehiclesList = context.vehicles.length > 0
    ? context.vehicles.map((vh, i) => `Vehicle ${i+1}:
- Details: ${vh.color || ""} ${vh.make || ""} ${vh.model || ""} (${vh.year || ""})
- Plate Number: ${vh.licensePlate || "Not Specified"}
- Owner: ${vh.ownerName || "Not Specified"}
- Seizure Status: ${vh.seizureStatus || "Not Specified"}
- Notes: ${vh.notes || "None"}`).join("\n\n")
    : "None recorded.";

  const seizedItemsList = context.seizedItems.length > 0
    ? context.seizedItems.map((si, i) => `Seized Property ${i+1}:
- Item: ${si.itemName}
- Serial Number: ${si.serialNumber || "N/A"}
- Description: ${si.description || "N/A"}
- Seizure Location: ${si.seizureLocation || "N/A"}
- Seizure Date: ${si.seizureDate ? new Date(si.seizureDate).toLocaleDateString() : "N/A"}
- Storage Location: ${si.storageLocation || "N/A"}
- Status: ${si.status || "In Custody"}`).join("\n\n")
    : "None recorded.";

  const medicalList = context.medicalInfos.length > 0
    ? context.medicalInfos.map((mi, i) => `Medical Record ${i+1}:
- Hospital: ${mi.hospitalName || "Not Specified"}
- Doctor: ${mi.doctorName || "Not Specified"}
- Admission Date: ${mi.admissionDate ? new Date(mi.admissionDate).toLocaleDateString() : "Not Specified"}
- Injury Type: ${mi.injuryType || "Not Specified"}
- Report No: ${mi.medicalReportNo || "Not Specified"}
- Severity: ${mi.severity || "Not Specified"}
- Treatment: ${mi.treatmentDetails || "Not Specified"}`).join("\n\n")
    : "None recorded.";

  const courtList = context.courtInfos.length > 0
    ? context.courtInfos.map((ci, i) => `Court Registry ${i+1}:
- Court: ${ci.courtName || "Not Specified"}
- Judge: ${ci.judgeName || "Not Specified"}
- Case Number: ${ci.caseNumber || "Not Specified"}
- Current Status: ${ci.currentStatus || "Not Specified"}
- Chargesheet Filed Date: ${ci.chargesheetFiledDate ? new Date(ci.chargesheetFiledDate).toLocaleDateString() : "Not Specified"}
- Next Hearing: ${ci.nextHearingDate ? new Date(ci.nextHearingDate).toLocaleDateString() : "Not Specified"}
- Judgement Details: ${ci.judgementDetails || "None"}`).join("\n\n")
    : "None recorded.";

  const evidenceList = context.evidence.length > 0
    ? context.evidence.map((e, i) => `Evidence Asset ${i+1}:
- Title: ${e.title}
- Type: ${e.type}
- Description: ${e.description || "N/A"}
- Notes: ${e.notes || "None"}`).join("\n\n")
    : "None recorded.";

  const activitiesTimeline = options.includeActivities !== false && context.activities.length > 0
    ? context.activities.map((a) => `[${new Date(a.createdAt).toLocaleString()}] ${a.description}`).join("\n")
    : "No logged timeline activities.";

  return `--- POLICE INFORMATION ---
${policeInfo}
 
--- INCIDENT DETAILS ---
${incidentInfo}
 
--- VICTIMS ---
${victimsList}
 
--- ACCUSED ---
${accusedList}
 
--- WITNESSES ---
${witnessesList}
 
--- VEHICLES ---
${vehiclesList}
 
--- SEIZED PROPERTY ---
${seizedItemsList}
 
--- MEDICAL REPORTS ---
${medicalList}
 
--- COURT PROCEEDINGS ---
${courtList}
 
--- EVIDENCE ASSETS ---
${evidenceList}
 
${options.includeActivities === false ? "" : `--- CHRONOLOGICAL ACTIVITIES ---\n${activitiesTimeline}`}`;
}

/**
 * Sanitizes user case narratives before injecting them into LLM prompts.
 * Escapes triple-quote sequences and limits character length.
 */
export function sanitizeUserNarrative(narrative: string | null | undefined): string {
  if (!narrative) {
    return "No case narrative provided.";
  }
  // Escape triple-quote block delimiters to prevent prompt injection escapes
  const escaped = narrative.replace(/"""/g, '\\"\\"\\"');
  // Limit total length to prevent huge injection payloads (10,000 characters)
  return escaped.substring(0, 10000);
}

import { CleanedLawReference } from "../retrievers/law.retriever";

export function formatLawsContext(
  laws: CleanedLawReference[], 
  fallbackText = "No direct law references found in the database. Do NOT cite any IPC/BNS sections. Mark confidence as LOW and explain that no legal references were found."
): string {
  return laws.length > 0 
    ? laws.map((law, index) => `
[LAW REFERENCE ${index + 1}]
Source: ${law.source}
Section: ${law.section}
Offense: ${law.offense}
Punishment: ${law.punishment}
Description: ${law.description}
--------------------------------------------------`).join("\n")
    : fallbackText;
}

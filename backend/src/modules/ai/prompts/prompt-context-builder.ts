/**
 * Utilities for serialising UnifiedCaseContext into prompt-friendly text blocks.
 *
 * Speed optimization: fields are truncated to control prompt token count.
 */

import type { UnifiedCaseContext } from '../../case/services/unified-context.service';

// ---------------------------------------------------------------------------
// Truncation helper
// ---------------------------------------------------------------------------

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...[truncated]' : str;
}

// ---------------------------------------------------------------------------
// Context serialisation
// ---------------------------------------------------------------------------

export function formatUnifiedContextForPrompt(context: UnifiedCaseContext): string {
  const profile = context.investigationProfile;

  const policeInfo = profile
    ? `- Police Station: ${profile.policeStation || 'Not Specified'}
- Investigating Officer: ${profile.investigatingOfficer || 'Not Specified'}
- FIR Number: ${profile.firNumber || 'Not Specified'}
- Date of Registration: ${profile.dateOfRegistration ? new Date(profile.dateOfRegistration).toLocaleDateString() : 'Not Specified'}`
    : 'Not Specified';

  const incidentInfo = profile
    ? `- Incident Date/Time: ${profile.incidentDateTime ? new Date(profile.incidentDateTime).toLocaleString() : 'Not Specified'}
- Incident Location: ${profile.incidentLocation || 'Not Specified'}
- Incident Description: ${truncate(profile.incidentDescription, 300) || 'Not Specified'}`
    : 'Not Specified';

  const victimsList = context.victims.length > 0
    ? context.victims.map((v, i) => `Victim ${i + 1}:
- Name: ${v.name}
- Phone: ${v.phone || 'Not Specified'}
- Address: ${v.address || 'Not Specified'}
- Statement: ${truncate(v.statement, 500) || 'Not Specified'}
- Injury Details: ${truncate(v.injuryDetails, 300) || 'Not Specified'}
- Status: ${v.status || 'Not Specified'}`).join('\n\n')
    : '';

  const accusedList = context.accused.length > 0
    ? context.accused.map((a, i) => `Accused ${i + 1}:
- Name: ${a.name}
- Phone: ${a.phone || 'Not Specified'}
- Address: ${a.address || 'Not Specified'}
- Statement: ${truncate(a.statement, 500) || 'Not Specified'}
- Arrest Status: ${a.arrestStatus || 'Not Specified'}
- Bail Details: ${a.bailDetails || 'Not Specified'}`).join('\n\n')
    : '';

  const witnessesList = context.witnesses.length > 0
    ? context.witnesses.map((w, i) => `Witness ${i + 1}:
- Name: ${w.name}
- Phone: ${w.phone || 'Not Specified'}
- Address: ${w.address || 'Not Specified'}
- Statement: ${truncate(w.statement, 500) || 'Not Specified'}
- Credibility: ${w.credibilityScore || 'Not Specified'}`).join('\n\n')
    : '';

  const vehiclesList = context.vehicles.length > 0
    ? context.vehicles.map((vh, i) => `Vehicle ${i + 1}:
- Details: ${vh.color || ''} ${vh.make || ''} ${vh.model || ''} (${vh.year || ''})
- Plate Number: ${vh.licensePlate || 'Not Specified'}
- Owner: ${vh.ownerName || 'Not Specified'}
- Seizure Status: ${vh.seizureStatus || 'Not Specified'}`).join('\n\n')
    : '';

  const seizedItemsList = context.seizedItems.length > 0
    ? context.seizedItems.map((si, i) => `Seized Property ${i + 1}:
- Item: ${si.itemName}
- Serial Number: ${si.serialNumber || 'N/A'}
- Description: ${truncate(si.description, 200) || 'N/A'}
- Seizure Location: ${si.seizureLocation || 'N/A'}
- Seizure Date: ${si.seizureDate ? new Date(si.seizureDate).toLocaleDateString() : 'N/A'}
- Status: ${si.status || 'In Custody'}`).join('\n\n')
    : '';

  const medicalList = context.medicalInfos.length > 0
    ? context.medicalInfos.map((mi, i) => `Medical Record ${i + 1}:
- Hospital: ${mi.hospitalName || 'Not Specified'}
- Doctor: ${mi.doctorName || 'Not Specified'}
- Admission Date: ${mi.admissionDate ? new Date(mi.admissionDate).toLocaleDateString() : 'Not Specified'}
- Injury Type: ${mi.injuryType || 'Not Specified'}
- Severity: ${mi.severity || 'Not Specified'}`).join('\n\n')
    : '';

  const courtList = context.courtInfos.length > 0
    ? context.courtInfos.map((ci, i) => `Court Registry ${i + 1}:
- Court: ${ci.courtName || 'Not Specified'}
- Judge: ${ci.judgeName || 'Not Specified'}
- Case Number: ${ci.caseNumber || 'Not Specified'}
- Current Status: ${ci.currentStatus || 'Not Specified'}
- Next Hearing: ${ci.nextHearingDate ? new Date(ci.nextHearingDate).toLocaleDateString() : 'Not Specified'}`).join('\n\n')
    : '';

  const evidenceList = context.evidence.length > 0
    ? context.evidence.map((e, i) => `Evidence Asset ${i + 1}:
- Title: ${e.title}
- Type: ${e.type}
- Description: ${truncate(e.description, 200) || 'N/A'}`).join('\n\n')
    : '';

  const activitiesTimeline = context.activities.length > 0
    ? context.activities.map((a) => `[${new Date(a.createdAt).toLocaleString()}] ${a.description}`).join('\n')
    : '';

  return `--- POLICE INFORMATION ---
${policeInfo}

--- INCIDENT DETAILS ---
${incidentInfo}

--- VICTIMS ---
${victimsList || 'None recorded.'}

--- ACCUSED ---
${accusedList || 'None recorded.'}

--- WITNESSES ---
${witnessesList || 'None recorded.'}

--- VEHICLES ---
${vehiclesList || 'None recorded.'}

--- SEIZED PROPERTY ---
${seizedItemsList || 'None recorded.'}

--- MEDICAL REPORTS ---
${medicalList || 'None recorded.'}

--- COURT PROCEEDINGS ---
${courtList || 'None recorded.'}

--- EVIDENCE ASSETS ---
${evidenceList || 'None recorded.'}

--- CHRONOLOGICAL ACTIVITIES ---
${activitiesTimeline || 'No logged timeline activities.'}`;
}

// ---------------------------------------------------------------------------
// Narrative sanitiser
// ---------------------------------------------------------------------------

export function sanitizeUserNarrative(narrative: string | null | undefined): string {
  if (!narrative) return 'No case narrative provided.';
  const escaped = narrative.replace(/"""/g, '\\"\\"\\"');
  return escaped.substring(0, 3_000); // Truncated from 10K to 3K for speed
}

import { UnifiedCaseContext } from "@/services/case/unified-context.service";

interface RetrievedLaw {
  section: string;
  offense: string;
  punishment: string;
  description: string;
  source: string;
}

/**
 * Builds the strict instruction prompt for Gemini 2.5 Flash.
 * Directs the LLM to output a compliant JSON matching the LegalAnalysisResult schema.
 * 
 * @param context The unified case context.
 * @param laws List of retrieved law sections from pgvector similarity search.
 * @returns Formatted prompt string.
 */
export function buildLegalAnalysisPrompt(context: UnifiedCaseContext, laws: RetrievedLaw[]): string {
  const lawsContext = laws.length > 0 
    ? laws.map((law, index) => `
[LAW REFERENCE ${index + 1}]
Source: ${law.source}
Section: ${law.section}
Offense: ${law.offense}
Punishment: ${law.punishment}
Description: ${law.description}
--------------------------------------------------`).join("\n")
    : "No direct law references found in the database. Apply general legal reasoning.";

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
- Seizure Details: Seized at ${si.seizureLocation || "N/A"} on ${si.seizureDate ? new Date(si.seizureDate).toLocaleDateString() : "N/A"}
- Status: ${si.status || "In Custody"}`).join("\n\n")
    : "None recorded.";

  return `You are a Senior Legal Counsel and expert prosecuting attorney.
Analyze the case narrative summary and structured case data provided by law enforcement, cross-reference it with the retrieved law sections, and generate a structured, professional legal analysis.

CASE NARRATIVE SUMMARY:
"""
${context.narrative}
"""

--- STRUCTURED CASE DATA (SINGLE SOURCE OF TRUTH) ---
[POLICE INFORMATION]
${policeInfo}

[INCIDENT DETAILS]
${incidentInfo}

[VICTIMS]
${victimsList}

[ACCUSED]
${accusedList}

[WITNESSES]
${witnessesList}

[VEHICLES]
${vehiclesList}

[SEIZED PROPERTY]
${seizedItemsList}

RETRIEVED LAW SECTIONS (CONTEXT):
${lawsContext}

STRICT INSTRUCTIONS:
1. Summarize the incident objectively in 2-3 sentences.
2. Determine which legal sections are applicable to the narrative and structured case data. For each applicable section, provide the section code (e.g. "IPC_140" or "IPC_420") and explain the exact reason why it applies based on the elements of the offense. Only include a section if there is clear evidence matching the offense description.
3. Provide a detailed step-by-step reasoning for your analysis, referencing the elements of the narrative and why they satisfy (or fail to satisfy) the retrieved laws.
4. Set a confidence level ("HIGH", "MEDIUM", or "LOW") reflecting how strongly the narrative and structured case data matches the elements of the legal sections.

You MUST respond with a single, valid JSON object matching the schema below. Do not wrap the JSON in markdown code blocks like \`\`\`json ... \`\`\` and do not write any introductory or concluding text.

EXPECTED JSON SCHEMA:
{
  "summary": "String detailing Case summary.",
  "applicableSections": [
    {
      "section": "String matching the Section code exactly (e.g. IPC_140)",
      "reason": "String explaining the exact applicability reason."
    }
  ],
  "reasoning": "String explaining the detailed legal analysis and logic step-by-step.",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}
`;
}

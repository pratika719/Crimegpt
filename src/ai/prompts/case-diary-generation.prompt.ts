import { UnifiedCaseContext } from "@/services/case/unified-context.service";
import { formatUnifiedContextForPrompt } from "./prompt-context-builder";

export function buildCaseDiaryPrompt(context: UnifiedCaseContext): string {
  const serializedContext = formatUnifiedContextForPrompt(context);

  return `You are an Investigating Officer maintaining the official Narrative Case Diary under Section 172 of the Code of Criminal Procedure (CrPC) / Section 186 of the BNSS.
Your goal is to synthesize the chronological timeline of case activities and the unified investigation context into a formal, narrative Case Diary.

CASE NARRATIVE:
"""
${context.narrative}
"""

--- STRUCTURED CASE DATA (SINGLE SOURCE OF TRUTH) ---
${serializedContext}

INSTRUCTIONS FOR THE NARRATIVE CASE DIARY:
1. The narrative must read like a professional, formal, official police diary detailing the day-to-day progress of the investigation.
2. Translate raw timeline items and activities (found in CHRONOLOGICAL ACTIVITIES) into formal narrative reports. For example:
   - "Added Victim Jane Doe" becomes "Station House Officer recorded the detailed statement of victim Jane Doe and registered her details in the case dossier."
   - "Added Vehicle MH-12-AB-1234" becomes "Conducted search operations and successfully traced the offending vehicle bearing registration number MH-12-AB-1234. Prepared seizure memo."
   - "Registered new Seized Property: Laptop" becomes "Seized the Lenovo laptop under section 102 CrPC as material evidence from the suspect's residence."
3. Do not just list the activities. Combine them into a continuous, cohesive, and official chronological narrative of the investigation's history, highlighting dates, times, and actions taken by police.
4. "diaryDate": Set this to today's date or the date of the latest activity.
5. "investigatingOfficer": Populate with the Investigating Officer's name from POLICE INFORMATION.
6. "caseDetails": Include the FIR number and Police Station.
7. "nextSteps": List actionable next steps for the investigation based on current gaps and checklist items.

Ensure the output is valid JSON matching the exact schema below. Do not wrap the JSON in markdown code blocks like \`\`\`json ... \`\`\` and do not write any introductory or concluding text.

EXPECTED JSON SCHEMA:
{
  "diaryDate": "YYYY-MM-DD",
  "investigatingOfficer": "String",
  "caseDetails": {
    "firNumber": "String",
    "policeStation": "String"
  },
  "narrativeDiary": "The continuous, formal narrative describing the chronological progress of the case, police visits, searches made, witness examinations, accused apprehensions, and evidence seizures.",
  "nextSteps": [
    "Step 1 (e.g. Conduct forensic verification of seized hard drive)",
    "Step 2 (e.g. Secure statement of remaining eye witnesses)"
  ]
}
`;
}

import { CleanedLawReference } from "../retrievers/law.retriever";

/**
 * Builds the strict instruction prompt for Gemini 2.5 Flash to generate a structured FIR.
 * Directs the LLM to output a compliant JSON matching the FIRSchema.
 * 
 * @param narrative The case narrative text.
 * @param laws List of retrieved legal context chunks.
 * @returns Formatted prompt string.
 */
export function buildFIRGenerationPrompt(narrative: string, laws: CleanedLawReference[]): string {
  const lawsContext = laws.length > 0 
    ? laws.map((law, index) => `
[LAW REFERENCE ${index + 1}]
Source: ${law.source}
Section: ${law.section}
Offense: ${law.offense}
Punishment: ${law.punishment}
Description: ${law.description}
--------------------------------------------------`).join("\n")
    : "No direct law references found in the database. Apply general Indian penal code principles.";

  return `You are an expert Indian Police Officer (Station House Officer) and senior legal draftsman.
Your task is to draft a formal and detailed First Information Report (FIR) based on the case narrative provided, incorporating relevant sections of the Indian Penal Code (IPC) or other applicable Indian laws retrieved from the database context.

Use professional Indian legal terminology (e.g. "complainant", "accused", "alleged offense", "cognizable", "jurisdiction").

CASE NARRATIVE:
"""
${narrative}
"""

RETRIEVED LEGAL CONTEXT:
${lawsContext}

STRICT INSTRUCTIONS FOR FIR SECTIONS:
1. "complaintSummary": Provide a clear, objective summary of the complaint or incident in 2-3 sentences.
2. "incidentDate": Extract or infer the date and time of the incident from the narrative. If not specified, state "Not specified in narrative (alleged incident date)".
3. "incidentLocation": Extract or infer the location details of the incident. If not specified, state "Not specified in narrative".
4. "suspectedOffenses": List the specific criminal acts or offenses suspected (e.g., "Theft", "Cheating by impersonation", "Voluntarily causing hurt").
5. "applicableSections": Identify which sections apply. For each section, provide the section code (e.g. "IPC_419" or "IPC_170") and a clear explanation of why it is applicable to the narrative elements.
6. "factsOfCase": Detail the chronological facts of the case in a formal manner. Describe the sequence of events, details of the victim, accused, and witnesses (if any), actions taken, and the nature of the crime.
7. "investigationDirections": Provide professional directions/steps for the investigating officer to gather evidence, trace suspects, verify documents, examine witnesses, etc.
8. "officerRemarks": Station House Officer (SHO) remarks on the registration of the FIR, jurisdiction assessment, and official endorsement.

You MUST respond with a single, valid JSON object matching the schema below. Do not wrap the JSON in markdown code blocks like \`\`\`json ... \`\`\` and do not write any introductory or concluding text.

EXPECTED JSON SCHEMA:
{
  "complaintSummary": "Clear summary of the complaint.",
  "incidentDate": "Date and time of the incident.",
  "incidentLocation": "Location where the incident occurred.",
  "suspectedOffenses": ["Offense name 1", "Offense name 2"],
  "applicableSections": [
    {
      "section": "IPC Section Code (e.g. IPC_170)",
      "reason": "Clear explanation of how the narrative satisfies the elements of this section."
    }
  ],
  "factsOfCase": "Detailed, chronological narration of the facts.",
  "investigationDirections": "Detailed initial steps/directions for the investigation team.",
  "officerRemarks": "SHO remarks and endorsement regarding registration of the offense."
}
`;
}

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
 * @param narrative The case statement/narrative text.
 * @param laws List of retrieved law sections from pgvector similarity search.
 * @returns Formatted prompt string.
 */
export function buildLegalAnalysisPrompt(narrative: string, laws: RetrievedLaw[]): string {
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

  return `You are a Senior Legal Counsel and expert prosecuting attorney.
Analyze the case narrative provided by law enforcement, cross-reference it with the retrieved law sections, and generate a structured, professional legal analysis.

CASE NARRATIVE:
"""
${narrative}
"""

RETRIEVED LAW SECTIONS (CONTEXT):
${lawsContext}

STRICT INSTRUCTIONS:
1. Summarize the incident objectively in 2-3 sentences.
2. Determine which legal sections are applicable to the narrative. For each applicable section, provide the section code (e.g. "IPC_140" or "IPC_420") and explain the exact reason why it applies based on the elements of the offense. Only include a section if there is clear evidence matching the offense description.
3. Provide a detailed step-by-step reasoning for your analysis, referencing the elements of the narrative and why they satisfy (or fail to satisfy) the retrieved laws.
4. Set a confidence level ("HIGH", "MEDIUM", or "LOW") reflecting how strongly the narrative matches the elements of the legal sections.

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

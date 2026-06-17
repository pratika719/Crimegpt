import { z } from "zod";

/**
 * Zod schema for the applicable law sections.
 */
export const ApplicableSectionSchema = z.object({
  section: z.string().min(1, "Section code is required"),
  reason: z.string().min(1, "Reasoning for section applicability is required"),
});

/**
 * Zod schema for the final legal analysis response.
 * Enforces the strict JSON structure required from Gemini.
 */
export const LegalAnalysisResultSchema = z.object({
  summary: z.string().min(1, "Case summary is required"),
  applicableSections: z.array(ApplicableSectionSchema),
  reasoning: z.string().min(1, "Detailed legal reasoning is required"),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

export type ApplicableSection = z.infer<typeof ApplicableSectionSchema>;
export type LegalAnalysisResult = z.infer<typeof LegalAnalysisResultSchema>;

/**
 * Helper utility to parse and validate Gemini's JSON string response.
 */
export function parseLegalAnalysisResult(jsonStr: string): LegalAnalysisResult {
  try {
    const rawData = JSON.parse(jsonStr);
    return LegalAnalysisResultSchema.parse(rawData);
  } catch (err: any) {
    throw new Error(`Failed to parse or validate legal analysis output: ${err.message}`);
  }
}

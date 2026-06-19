import { z } from "zod";

export const RiskLevelSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const PrioritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const RiskLevelAssessmentSchema = z.object({
  level: RiskLevelSchema,
  reasoning: z.string(),
});

export const MissingInformationSchema = z.object({
  items: z.array(z.string()),
  reasoning: z.string(),
});

export const NextStepSchema = z.object({
  task: z.string(),
  priority: PrioritySchema,
  reason: z.string(),
});

export const SuggestedNextStepsSchema = z.object({
  steps: z.array(NextStepSchema),
  reasoning: z.string(),
});

export const LegalSectionSchema = z.object({
  section: z.string(),
  offense: z.string(),
  applicability: z.string(),
});

export const ApplicableLegalSectionsSchema = z.object({
  sections: z.array(LegalSectionSchema),
  reasoning: z.string(),
});

export const EvidenceCompletenessSchema = z.object({
  score: z.number().min(0).max(100),
  assessment: z.string(),
  gaps: z.array(z.string()),
  reasoning: z.string(),
});

export const AIDiagnosticsResultSchema = z.object({
  riskLevel: RiskLevelAssessmentSchema,
  missingInformation: MissingInformationSchema,
  suggestedNextSteps: SuggestedNextStepsSchema,
  applicableLegalSections: ApplicableLegalSectionsSchema,
  evidenceCompleteness: EvidenceCompletenessSchema,
});

export type AIDiagnosticsResult = z.infer<typeof AIDiagnosticsResultSchema>;

export function parseAIDiagnosticsResult(jsonStr: string): AIDiagnosticsResult {
  try {
    const rawData = JSON.parse(jsonStr);
    return AIDiagnosticsResultSchema.parse(rawData);
  } catch (err: any) {
    throw new Error(`Failed to parse or validate AI diagnostics output: ${err.message}`);
  }
}


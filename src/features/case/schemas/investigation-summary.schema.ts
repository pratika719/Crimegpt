import { z } from "zod";

/**
 * Zod schema for validated applicable sections within the Investigation Summary.
 */
export const SummaryApplicableSectionSchema = z.object({
  section: z.string().min(1, "Section is required"),
  reason: z.string().min(1, "Reasoning is required"),
});

/**
 * Zod schema for structured Investigation Summary generation.
 * Enforces strict validation of all fields.
 */
export const InvestigationSummarySchema = z.object({
  executiveSummary: z
    .string()
    .min(10, "Executive summary must be at least 10 characters"),

  incidentOverview: z
    .string()
    .min(10, "Incident overview must be at least 10 characters"),

  factsEstablished: z
    .string()
    .min(10, "Facts established must be at least 10 characters"),

  applicableSections: z
    .array(SummaryApplicableSectionSchema), // Allowed to be empty if no sections apply

  evidenceAssessment: z
    .string()
    .min(10, "Evidence assessment must be at least 10 characters"),

  personsInvolved: z
    .string()
    .min(5, "Persons involved information is required"),

  investigationFindings: z
    .string()
    .min(10, "Investigation findings must be at least 10 characters"),

  potentialGaps: z
    .string()
    .min(10, "Potential gaps description must be at least 10 characters"),

  recommendedNextSteps: z
    .string()
    .min(10, "Recommended next steps are required"),

  conclusion: z
    .string()
    .min(10, "Conclusion must be at least 10 characters"),
});

export type InvestigationSummaryOutput = z.infer<typeof InvestigationSummarySchema>;

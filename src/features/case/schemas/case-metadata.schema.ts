import { z } from "zod";

/**
 * Zod schema for creating/saving case metadata.
 * IncidentDate accepts any type (string or Date) to avoid Hook Form resolver conflicts.
 */
export const CreateCaseMetadataSchema = z.object({
  incidentDate: z.any().nullable().optional(),
  incidentTime: z.string().max(100).nullable().optional(),
  incidentLocation: z.string().max(300).nullable().optional(),
  victimName: z.string().max(200).nullable().optional(),
  victimStatement: z.string().nullable().optional(),
  suspectName: z.string().max(200).nullable().optional(),
  suspectDescription: z.string().nullable().optional(),
  witnessInformation: z.string().nullable().optional(),
  evidenceSummary: z.string().nullable().optional(),
  officerNotes: z.string().nullable().optional(),
  caseId: z.string().min(1, "Case ID is required"),
});

/**
 * Zod schema for updating case metadata.
 */
export const UpdateCaseMetadataSchema = CreateCaseMetadataSchema.partial().omit({ caseId: true });

export type CreateCaseMetadataInput = z.infer<typeof CreateCaseMetadataSchema>;
export type UpdateCaseMetadataInput = z.infer<typeof UpdateCaseMetadataSchema>;
export type CaseMetadataOutput = z.infer<typeof CreateCaseMetadataSchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

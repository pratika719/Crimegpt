import { z } from "zod";

export const EvidenceTypesList = [
  "DOCUMENT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "SCREENSHOT",
  "LOG_FILE",
  "OTHER"
] as const;

export const EvidenceProcessingStatusList = [
  "NOT_STARTED",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED"
] as const;

export const createEvidenceSchema = z.object({
  caseId: z.string().cuid(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2_000).optional(),
  type: z.enum(EvidenceTypesList),
  notes: z.string().trim().max(10_000).optional(),
  fileUrl: z.string().url().optional(),
  mimeType: z.string().trim().max(120).optional(),
  fileSizeBytes: z.number().int().positive().optional(),
  hashSha256: z.string().length(64).optional(),
  extractedText: z.string().trim().max(250_000).optional(),
});

export const updateEvidenceSchema = createEvidenceSchema.partial().omit({ caseId: true });

export const updateEvidenceProcessingStatusSchema = z.object({
  evidenceId: z.string().cuid(),
  processingStatus: z.enum(EvidenceProcessingStatusList),
  processingError: z.string().trim().max(2_000).optional(),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
export type UpdateEvidenceInput = z.infer<typeof updateEvidenceSchema>;
export type UpdateEvidenceProcessingStatusInput = z.infer<typeof updateEvidenceProcessingStatusSchema>;

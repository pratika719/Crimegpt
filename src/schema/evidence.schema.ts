import { z } from "zod";

export const EvidenceType = {
  DOCUMENT: "DOCUMENT",
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  AUDIO: "AUDIO",
  SCREENSHOT: "SCREENSHOT",
  LOG_FILE: "LOG_FILE",
  OTHER: "OTHER",
} as const;

export type EvidenceType = typeof EvidenceType[keyof typeof EvidenceType];

export const EvidenceTypeSchema = z.enum([
  "DOCUMENT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "SCREENSHOT",
  "LOG_FILE",
  "OTHER",
]);

export const CreateEvidenceSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title cannot exceed 200 characters"),
  type: EvidenceTypeSchema,
  description: z.string().nullable().optional().or(z.literal("")),
  notes: z.string().nullable().optional().or(z.literal("")),
  fileUrl: z.string().max(500, "File URL/Name cannot exceed 500 characters").nullable().optional().or(z.literal("")),
  caseId: z.string().min(1, "Case ID is required"),
});

export const UpdateEvidenceSchema = CreateEvidenceSchema.partial().omit({ caseId: true });

export type CreateEvidenceInput = z.infer<typeof CreateEvidenceSchema>;
export type UpdateEvidenceInput = z.infer<typeof UpdateEvidenceSchema>;

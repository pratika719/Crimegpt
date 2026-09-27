import { z } from "zod";

export const DocumentTypeList = [
  "FIR",
  "INVESTIGATION_SUMMARY",
  "CHARGE_SHEET",
  "LEGAL_ANALYSIS",
  "AI_DIAGNOSTICS",
  "REMAND_REQUEST",
  "CASE_DIARY"
] as const;

export type DocumentType = (typeof DocumentTypeList)[number];

export const GeneratedDocumentStatusList = [
  "DRAFT",
  "GENERATING",
  "COMPLETED",
  "FAILED",
  "ARCHIVED"
] as const;

export type GeneratedDocumentStatus = (typeof GeneratedDocumentStatusList)[number];

export const generateDocumentSchema = z.object({
  caseId: z.string().cuid(),
  type: z.enum(DocumentTypeList) as z.ZodType<DocumentType>,
});

export const updateGeneratedDocumentStatusSchema = z.object({
  documentId: z.string().cuid(),
  status: z.enum(GeneratedDocumentStatusList) as z.ZodType<GeneratedDocumentStatus>,
  errorMessage: z.string().trim().max(2_000).optional(),
});

export const generatedDocumentVersionSchema = z.object({
  caseId: z.string().cuid(),
  type: z.enum(DocumentTypeList) as z.ZodType<DocumentType>,
});

export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;
export type UpdateGeneratedDocumentStatusInput = z.infer<
  typeof updateGeneratedDocumentStatusSchema
>;
export type GeneratedDocumentVersionInput = z.infer<
  typeof generatedDocumentVersionSchema
>;
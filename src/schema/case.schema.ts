import { z } from "zod";
import type { CaseStatus } from "@/generated/prisma/client";
export const CreateCaseSchema = z.object({
  title: z
    .string()
    .min(5)
    .max(200),

  narrative: z
    .string()
    .min(20)
    .max(10000),
});

export type CreateCaseInput =
  z.infer<typeof CreateCaseSchema>;

export const UpdateCaseSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),

  narrative: z
    .string()
    .min(20, "Narrative must be at least 20 characters")
    .max(10000, "Narrative cannot exceed 10,000 characters")
    .optional(),

  status: z.enum(["OPEN", "UNDER_INVESTIGATION", "CLOSED"]).optional(),
});

export type UpdateCaseInput = z.infer<typeof UpdateCaseSchema>;
export const updateCaseStatusSchema = z.object({
  caseId: z.string().cuid(),
  status: z.enum(["OPEN", "UNDER_INVESTIGATION", "CLOSED"]) as z.ZodType<CaseStatus>,
});

export const archiveCaseSchema = z.object({
  caseId: z.string().cuid(),
});
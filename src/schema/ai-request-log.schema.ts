import { z } from "zod";
import type { AIRequestStatus, AIRequestType } from "@/generated/prisma/client";

export const AIRequestTypeList = [
  "LEGAL_ANALYSIS",
  "FIR_GENERATION",
  "INVESTIGATION_SUMMARY",
  "CHARGE_SHEET",
  "CHAT",
  "AI_DIAGNOSTICS_GENERATION",
  "REMAND_REQUEST_GENERATION",
  "CASE_DIARY_GENERATION"
] as const;

export const AIRequestStatusList = [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED"
] as const;

export const createAIRequestLogSchema = z.object({
  caseId: z.string().cuid().optional(),
  requestType: z.enum(AIRequestTypeList) as z.ZodType<AIRequestType>,
  status: z.enum(AIRequestStatusList).default("PENDING") as z.ZodType<AIRequestStatus>,
  prompt: z.string().optional(),
  retrievedContext: z.string().optional(),
  response: z.string().optional(),
  modelUsed: z.string().trim().max(120).optional(),
  tokenUsage: z.record(z.string(), z.unknown()).optional(),
  latencyMs: z.number().int().min(0).optional(),
  errorCode: z.string().trim().max(120).optional(),
  errorMessage: z.string().trim().max(2_000).optional(),
  retryCount: z.number().int().min(0).default(0),
  queueJobId: z.string().trim().max(120).optional(),
  inputHash: z.string().trim().max(128).optional(),
});

export const updateAIRequestLogStatusSchema = z.object({
  requestLogId: z.string().cuid(),
  status: z.enum(AIRequestStatusList) as z.ZodType<AIRequestStatus>,
  response: z.string().optional(),
  tokenUsage: z.record(z.string(), z.unknown()).optional(),
  latencyMs: z.number().int().min(0).optional(),
  errorCode: z.string().trim().max(120).optional(),
  errorMessage: z.string().trim().max(2_000).optional(),
  retryCount: z.number().int().min(0).optional(),
  queueJobId: z.string().trim().max(120).optional(),
});

export type CreateAIRequestLogInput = z.infer<typeof createAIRequestLogSchema>;
export type UpdateAIRequestLogStatusInput = z.infer<
  typeof updateAIRequestLogStatusSchema
>;
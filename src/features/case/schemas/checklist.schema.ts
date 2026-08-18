import { z } from "zod";

export const CreateChecklistItemSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200, "Task title cannot exceed 200 characters"),
  caseId: z.string().min(1, "Case ID is required"),
});

export const UpdateChecklistItemSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200, "Task title cannot exceed 200 characters").optional(),
  completed: z.boolean().optional(),
  completedAt: z.any().nullable().optional(),
});

export type CreateChecklistItemInput = z.infer<typeof CreateChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof UpdateChecklistItemSchema>;

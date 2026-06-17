import { z } from "zod";

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
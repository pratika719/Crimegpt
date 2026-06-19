import { z } from "zod";

export const PersonRole = {
  VICTIM: "VICTIM",
  SUSPECT: "SUSPECT",
  WITNESS: "WITNESS",
  OFFICER: "OFFICER",
} as const;

export type PersonRole = typeof PersonRole[keyof typeof PersonRole];

export const PersonRoleSchema = z.enum(["VICTIM", "SUSPECT", "WITNESS", "OFFICER"]);

export const CreatePersonSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name cannot exceed 200 characters"),
  role: PersonRoleSchema,
  phone: z.string().max(50, "Phone number cannot exceed 50 characters").nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional().or(z.literal("")),
  statement: z.string().nullable().optional().or(z.literal("")),
  notes: z.string().nullable().optional().or(z.literal("")),
  caseId: z.string().min(1, "Case ID is required"),
});

export const UpdatePersonSchema = CreatePersonSchema.partial().omit({ caseId: true });

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;

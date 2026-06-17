import { z } from "zod";

/**
 * Zod schema for structured FIR generation.
 * Enforces strict validation of all fields.
 */
export const FIRSchema = z.object({
  complaintSummary: z
    .string()
    .min(10, "Complaint summary must be at least 10 characters")
    .max(1000, "Complaint summary must not exceed 1000 characters"),

  incidentDate: z
    .string()
    .min(3, "Incident date/time information is required"),

  incidentLocation: z
    .string()
    .min(3, "Incident location details are required"),

  suspectedOffenses: z
    .array(z.string().min(1, "Offense description cannot be empty"))
    .min(1, "At least one suspected offense is required"),

  applicableSections: z
    .array(
      z.object({
        section: z.string().min(1, "Section code is required (e.g. IPC_302)"),
        reason: z.string().min(1, "Applicability reasoning is required"),
      })
    )
    .min(1, "At least one applicable section is required"),

  factsOfCase: z
    .string()
    .min(20, "Facts of case must be detailed (at least 20 characters)"),

  investigationDirections: z
    .string()
    .min(10, "Initial investigation directions are required"),

  officerRemarks: z
    .string()
    .min(5, "Officer remarks are required"),
});

export type FIROutput = z.infer<typeof FIRSchema>;

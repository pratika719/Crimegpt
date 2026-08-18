import { z } from "zod";

export const RemandRequestSchema = z.object({
  caseDetails: z.object({
    firNumber: z.string().min(1, "FIR Number is required"),
    policeStation: z.string().min(1, "Police Station is required"),
    investigatingOfficer: z.string().min(1, "Investigating Officer is required"),
  }),
  accusedDetails: z.array(z.object({
    name: z.string().min(1, "Accused name is required"),
    arrestDateTime: z.string().min(1, "Arrest date and time is required"),
    currentCustodyStatus: z.string().min(1, "Current custody status is required"),
  })).min(1, "At least one accused must be subject to the remand request"),
  groundsForRemand: z.array(z.string().min(5, "Each ground for remand must be at least 5 characters")).min(1, "At least one ground for remand is required"),
  custodyRequested: z.object({
    type: z.enum(["POLICE_CUSTODY", "JUDICIAL_CUSTODY"]),
    durationDays: z.number().int().min(1, "Must request at least 1 day of custody"),
  }),
  investigationProgress: z.string().min(20, "Investigation progress description must be at least 20 characters"),
  officerRemarks: z.string().min(5, "Officer remarks are required"),
});

export type RemandRequestOutput = z.infer<typeof RemandRequestSchema>;

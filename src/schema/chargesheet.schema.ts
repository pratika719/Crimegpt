import { z } from "zod";

export const ChargeSheetAccusedSchema = z.object({
  name: z.string().min(1, "Accused name is required"),
  arrestStatus: z.string().min(1, "Arrest status is required"),
  bailDetails: z.string().optional(),
  applicableSections: z.array(z.string()).min(1, "At least one applicable section is required"),
  evidenceLinks: z.string().min(1, "Specific evidence/facts links for this accused are required"),
});

export const ChargeSheetSchema = z.object({
  caseDetails: z.object({
    firNumber: z.string().min(1, "FIR Number is required"),
    policeStation: z.string().min(1, "Police Station is required"),
    investigatingOfficer: z.string().min(1, "Investigating Officer is required"),
    dateOfRegistration: z.string().min(1, "Registration date is required"),
  }),
  accusedList: z.array(ChargeSheetAccusedSchema).min(1, "At least one accused must be listed in the Charge Sheet"),
  briefFacts: z.string().min(20, "Brief facts must be at least 20 characters"),
  evidenceCollected: z.object({
    physicalEvidence: z.array(z.string()),
    documentaryEvidence: z.array(z.string()),
    scientificOrMedicalEvidence: z.array(z.string()),
  }),
  witnessStatements: z.array(z.object({
    name: z.string().min(1, "Witness name is required"),
    summaryOfStatement: z.string().min(10, "Summary must be at least 10 characters"),
    credibilityScore: z.string().optional(),
  })),
  finalConclusion: z.string().min(15, "Final conclusion / recommendation is required"),
  officerRemarks: z.string().min(5, "Officer remarks are required"),
});

export type ChargeSheetOutput = z.infer<typeof ChargeSheetSchema>;

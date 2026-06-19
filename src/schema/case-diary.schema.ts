import { z } from "zod";

export const CaseDiarySchema = z.object({
  diaryDate: z.string().min(1, "Diary date is required"),
  investigatingOfficer: z.string().min(1, "Investigating Officer name is required"),
  caseDetails: z.object({
    firNumber: z.string().min(1, "FIR Number is required"),
    policeStation: z.string().min(1, "Police Station is required"),
  }),
  narrativeDiary: z.string().min(20, "Narrative diary entry must be detailed and at least 20 characters"),
  nextSteps: z.array(z.string().min(3, "Action item must be at least 3 characters")),
});

export type CaseDiaryOutput = z.infer<typeof CaseDiarySchema>;

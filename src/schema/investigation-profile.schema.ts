import { z } from "zod";

export const InvestigationProfileSchema = z.object({
  firNumber: z.string().max(100).nullable().optional().or(z.literal("")),
  policeStation: z.string().max(200).nullable().optional().or(z.literal("")),
  investigatingOfficer: z.string().max(200).nullable().optional().or(z.literal("")),
  dateOfRegistration: z.string().nullable().optional().or(z.literal("")),
  incidentDateTime: z.string().nullable().optional().or(z.literal("")),
  incidentLocation: z.string().max(500).nullable().optional().or(z.literal("")),
  incidentDescription: z.string().nullable().optional().or(z.literal("")),
  investigationNotes: z.string().nullable().optional().or(z.literal("")),
});

export const VictimSchema = z.object({
  // Person fields
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(50).nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional().or(z.literal("")),
  statement: z.string().nullable().optional().or(z.literal("")),
  notes: z.string().nullable().optional().or(z.literal("")),
  // Victim fields
  injuryDetails: z.string().nullable().optional().or(z.literal("")),
  status: z.string().max(100).nullable().optional().or(z.literal("")), // e.g. Deceased, Injured, Stable, Unharmed
});

export const AccusedSchema = z.object({
  // Person fields
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(50).nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional().or(z.literal("")),
  statement: z.string().nullable().optional().or(z.literal("")),
  notes: z.string().nullable().optional().or(z.literal("")),
  // Accused fields
  arrestStatus: z.string().max(100).nullable().optional().or(z.literal("")), // e.g. Absconding, Arrested, Custody, On Bail
  bailDetails: z.string().nullable().optional().or(z.literal("")),
});

export const WitnessSchema = z.object({
  // Person fields
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(50).nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional().or(z.literal("")),
  statement: z.string().nullable().optional().or(z.literal("")),
  notes: z.string().nullable().optional().or(z.literal("")),
  // Witness fields
  statementDate: z.string().nullable().optional().or(z.literal("")),
  credibilityScore: z.string().max(100).nullable().optional().or(z.literal("")), // e.g. High, Medium, Low
});

export const VehicleSchema = z.object({
  make: z.string().max(100).nullable().optional().or(z.literal("")),
  model: z.string().max(100).nullable().optional().or(z.literal("")),
  year: z.coerce.number().int().min(1800).max(2100).nullable().optional(),
  color: z.string().max(50).nullable().optional().or(z.literal("")),
  licensePlate: z.string().max(50).nullable().optional().or(z.literal("")),
  registrationState: z.string().max(100).nullable().optional().or(z.literal("")),
  ownerName: z.string().max(200).nullable().optional().or(z.literal("")),
  seizureStatus: z.string().max(100).nullable().optional().or(z.literal("")), // e.g. Seized, Released, Wanted
  notes: z.string().nullable().optional().or(z.literal("")),
});

export const SeizedItemSchema = z.object({
  itemName: z.string().min(1, "Item Name is required").max(200),
  description: z.string().nullable().optional().or(z.literal("")),
  serialNumber: z.string().max(100).nullable().optional().or(z.literal("")),
  seizureLocation: z.string().max(500).nullable().optional().or(z.literal("")),
  seizureDate: z.string().nullable().optional().or(z.literal("")),
  officerInCharge: z.string().max(200).nullable().optional().or(z.literal("")),
  storageLocation: z.string().max(200).nullable().optional().or(z.literal("")),
  status: z.string().max(100).nullable().optional().or(z.literal("")), // e.g. In Custody, Released, Destroyed
});

export const MedicalInformationSchema = z.object({
  hospitalName: z.string().max(200).nullable().optional().or(z.literal("")),
  doctorName: z.string().max(200).nullable().optional().or(z.literal("")),
  admissionDate: z.string().nullable().optional().or(z.literal("")),
  injuryType: z.string().max(200).nullable().optional().or(z.literal("")),
  medicalReportNo: z.string().max(100).nullable().optional().or(z.literal("")),
  treatmentDetails: z.string().nullable().optional().or(z.literal("")),
  severity: z.string().max(100).nullable().optional().or(z.literal("")), // e.g. Critical, Severe, Moderate, Mild
});

export const CourtInformationSchema = z.object({
  courtName: z.string().max(200).nullable().optional().or(z.literal("")),
  judgeName: z.string().max(200).nullable().optional().or(z.literal("")),
  caseNumber: z.string().max(100).nullable().optional().or(z.literal("")),
  nextHearingDate: z.string().nullable().optional().or(z.literal("")),
  chargesheetFiledDate: z.string().nullable().optional().or(z.literal("")),
  currentStatus: z.string().max(100).nullable().optional().or(z.literal("")), // e.g. Trial, Hearing, Disposed
  judgementDetails: z.string().nullable().optional().or(z.literal("")),
});

import { caseActivityRepository } from "@/repositories/case-activity.repository";
import { ActivityType } from "@/generated/prisma/client";

export class ActivityService {
  private repository = caseActivityRepository;

  /**
   * Logs activity when a case profile is created.
   */
  async logCaseCreated(caseId: string, caseTitle: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.CASE_CREATED,
      description: `Case dossier "${caseTitle}" was created and registered in directory.`,
      metadata: { caseTitle },
    });
  }

  /**
   * Logs activity when general case information is updated.
   */
  async logCaseUpdated(caseId: string, details: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.CASE_UPDATED,
      description: `Case dossier profile updated: ${details}`,
    });
  }

  /**
   * Logs activity when case metadata is initialized.
   */
  async logMetadataCreated(caseId: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.METADATA_CREATED,
      description: "Case investigation metadata profile established.",
    });
  }

  /**
   * Logs activity when case metadata is updated.
   */
  async logMetadataUpdated(caseId: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.METADATA_UPDATED,
      description: "Case investigation metadata profile updated.",
    });
  }

  /**
   * Logs activity when an AI document is successfully generated.
   */
  async logDocumentGenerated(caseId: string, docType: string, docTitle: string, version?: number) {
    let activityType: ActivityType = ActivityType.DOCUMENT_CREATED;
    let description = `Generated document "${docTitle}" for case.`;

    if (docType === "LEGAL_ANALYSIS") {
      activityType = ActivityType.LEGAL_ANALYSIS_GENERATED;
      description = `AI Legal Analysis report generated successfully.`;
    } else if (docType === "FIR") {
      activityType = ActivityType.FIR_GENERATED;
      description = `First Information Report (FIR) v${version || 1} generated successfully.`;
    } else if (docType === "INVESTIGATION_SUMMARY") {
      activityType = ActivityType.INVESTIGATION_SUMMARY_GENERATED;
      description = `Investigation Summary Report v${version || 1} compiled successfully.`;
    } else if (docType === "CHARGE_SHEET") {
      activityType = ActivityType.CHARGE_SHEET_GENERATED;
      description = `Charge Sheet (Final Report) v${version || 1} generated successfully.`;
    } else if (docType === "REMAND_REQUEST") {
      activityType = ActivityType.REMAND_REQUEST_GENERATED;
      description = `Remand Request Application v${version || 1} compiled successfully.`;
    } else if (docType === "CASE_DIARY") {
      activityType = ActivityType.CASE_DIARY_GENERATED;
      description = `Official Narrative Case Diary v${version || 1} generated successfully.`;
    } else if (docType === "AI_DIAGNOSTICS") {
      activityType = ActivityType.AI_DIAGNOSTICS_GENERATED;
      description = `AI Case Cognitive Diagnostics report generated successfully.`;
    }

    return this.repository.create({
      caseId,
      activityType,
      description,
      metadata: { docTitle, version },
    });
  }

  /**
   * Logs activity when a document is downloaded as PDF.
   */
  async logDocumentDownloaded(caseId: string, docType: string, docTitle: string, version: number) {
    // Standardize descriptive prefix: e.g. "Downloaded FIR"
    let actionDesc = `Downloaded ${docType === "FIR" ? "FIR" : docType === "CHARGE_SHEET" ? "Charge Sheet" : docType === "REMAND_REQUEST" ? "Remand Request" : docType === "INVESTIGATION_SUMMARY" ? "Investigation Summary" : docType === "CASE_DIARY" ? "Case Diary" : "document"}`;
    return this.repository.create({
      caseId,
      activityType: ActivityType.DOCUMENT_DOWNLOADED,
      description: `${actionDesc} (v${version}) as PDF.`,
      metadata: { docType, docTitle, version },
    });
  }

  /**
   * Logs activity when a document is regenerated.
   */
  async logDocumentRegenerated(caseId: string, docType: string, docTitle: string, version: number) {
    let actionDesc = `Regenerated ${docType === "FIR" ? "FIR" : docType === "CHARGE_SHEET" ? "Charge Sheet" : docType === "REMAND_REQUEST" ? "Remand Request" : docType === "INVESTIGATION_SUMMARY" ? "Investigation Summary" : docType === "CASE_DIARY" ? "Case Diary" : "document"}`;
    return this.repository.create({
      caseId,
      activityType: ActivityType.DOCUMENT_REGENERATED,
      description: `${actionDesc} v${version} successfully.`,
      metadata: { docType, docTitle, version },
    });
  }

  private formatRole(role: string): string {
    const map: Record<string, string> = {
      VICTIM: "Victim",
      SUSPECT: "Suspect",
      WITNESS: "Witness",
      OFFICER: "Investigating Officer",
    };
    return map[role] || role;
  }

  async logPersonAdded(caseId: string, name: string, role: string) {
    const formattedRole = this.formatRole(role);
    return this.repository.create({
      caseId,
      activityType: ActivityType.PERSON_ADDED,
      description: `Added ${formattedRole} "${name}" to case dossier.`,
      metadata: { name, role },
    });
  }

  async logPersonUpdated(caseId: string, name: string, role: string) {
    const formattedRole = this.formatRole(role);
    return this.repository.create({
      caseId,
      activityType: ActivityType.PERSON_UPDATED,
      description: `Updated details for ${formattedRole} "${name}".`,
      metadata: { name, role },
    });
  }

  async logPersonDeleted(caseId: string, name: string, role: string) {
    const formattedRole = this.formatRole(role);
    return this.repository.create({
      caseId,
      activityType: ActivityType.PERSON_DELETED,
      description: `Removed ${formattedRole} "${name}" from case dossier.`,
      metadata: { name, role },
    });
  }

  private formatEvidenceType(type: string): string {
    const map: Record<string, string> = {
      DOCUMENT: "Document",
      IMAGE: "Image",
      VIDEO: "Video",
      AUDIO: "Audio",
      SCREENSHOT: "Screenshot",
      LOG_FILE: "Log File",
      OTHER: "Other Asset",
    };
    return map[type] || type;
  }

  async logEvidenceAdded(caseId: string, title: string, type: string) {
    const formattedType = this.formatEvidenceType(type);
    return this.repository.create({
      caseId,
      activityType: ActivityType.EVIDENCE_ADDED,
      description: `Registered new ${formattedType} evidence: "${title}"`,
      metadata: { title, type },
    });
  }

  async logEvidenceUpdated(caseId: string, title: string, type: string) {
    const formattedType = this.formatEvidenceType(type);
    return this.repository.create({
      caseId,
      activityType: ActivityType.EVIDENCE_UPDATED,
      description: `Updated details for ${formattedType} evidence: "${title}"`,
      metadata: { title, type },
    });
  }

  async logEvidenceDeleted(caseId: string, title: string, type: string) {
    const formattedType = this.formatEvidenceType(type);
    return this.repository.create({
      caseId,
      activityType: ActivityType.EVIDENCE_DELETED,
      description: `Removed ${formattedType} evidence: "${title}"`,
      metadata: { title, type },
    });
  }

  async logChecklistItemCompleted(caseId: string, title: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.CHECKLIST_ITEM_COMPLETED,
      description: `Completed checklist task: "${title}"`,
      metadata: { title },
    });
  }

  async logInvestigationProfileUpdated(caseId: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.INVESTIGATION_PROFILE_UPDATED,
      description: "Updated Case Investigation Profile.",
    });
  }

  async logVictimAdded(caseId: string, name: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.VICTIM_ADDED,
      description: `Added Victim "${name}" to case dossier.`,
      metadata: { name },
    });
  }

  async logVictimUpdated(caseId: string, name: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.VICTIM_UPDATED,
      description: `Updated Victim "${name}" details.`,
      metadata: { name },
    });
  }

  async logVictimDeleted(caseId: string, name: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.VICTIM_DELETED,
      description: `Removed Victim "${name}" from case dossier.`,
      metadata: { name },
    });
  }

  async logAccusedAdded(caseId: string, name: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.ACCUSED_ADDED,
      description: `Added Accused "${name}" to case dossier.`,
      metadata: { name },
    });
  }

  async logAccusedUpdated(caseId: string, name: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.ACCUSED_UPDATED,
      description: `Updated Accused "${name}" details.`,
      metadata: { name },
    });
  }

  async logAccusedDeleted(caseId: string, name: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.ACCUSED_DELETED,
      description: `Removed Accused "${name}" from case dossier.`,
      metadata: { name },
    });
  }

  async logWitnessAdded(caseId: string, name: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.WITNESS_ADDED,
      description: `Added Witness "${name}" to case dossier.`,
      metadata: { name },
    });
  }

  async logWitnessUpdated(caseId: string, name: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.WITNESS_UPDATED,
      description: `Updated Witness "${name}" details.`,
      metadata: { name },
    });
  }

  async logWitnessDeleted(caseId: string, name: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.WITNESS_DELETED,
      description: `Removed Witness "${name}" from case dossier.`,
      metadata: { name },
    });
  }

  async logVehicleAdded(caseId: string, licensePlate: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.VEHICLE_ADDED,
      description: `Added Vehicle (Plate: ${licensePlate || "N/A"}) to case dossier.`,
      metadata: { licensePlate },
    });
  }

  async logVehicleUpdated(caseId: string, licensePlate: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.VEHICLE_UPDATED,
      description: `Updated Vehicle (Plate: ${licensePlate || "N/A"}) details.`,
      metadata: { licensePlate },
    });
  }

  async logVehicleDeleted(caseId: string, licensePlate: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.VEHICLE_DELETED,
      description: `Removed Vehicle (Plate: ${licensePlate || "N/A"}) from case dossier.`,
      metadata: { licensePlate },
    });
  }

  async logSeizedItemAdded(caseId: string, itemName: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.SEIZED_ITEM_ADDED,
      description: `Registered new Seized Property: "${itemName}"`,
      metadata: { itemName },
    });
  }

  async logSeizedItemUpdated(caseId: string, itemName: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.SEIZED_ITEM_UPDATED,
      description: `Updated Seized Property details: "${itemName}"`,
      metadata: { itemName },
    });
  }

  async logSeizedItemDeleted(caseId: string, itemName: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.SEIZED_ITEM_DELETED,
      description: `Removed Seized Property: "${itemName}"`,
      metadata: { itemName },
    });
  }

  async logMedicalInfoAdded(caseId: string, doctorName: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.MEDICAL_INFO_ADDED,
      description: `Added Medical Report by Dr. ${doctorName || "N/A"}.`,
      metadata: { doctorName },
    });
  }

  async logMedicalInfoUpdated(caseId: string, doctorName: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.MEDICAL_INFO_UPDATED,
      description: `Updated Medical Report by Dr. ${doctorName || "N/A"}.`,
      metadata: { doctorName },
    });
  }

  async logMedicalInfoDeleted(caseId: string, doctorName: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.MEDICAL_INFO_DELETED,
      description: `Removed Medical Report by Dr. ${doctorName || "N/A"}.`,
      metadata: { doctorName },
    });
  }

  async logCourtInfoAdded(caseId: string, caseNumber: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.COURT_INFO_ADDED,
      description: `Established Court Case Registry (Ref: ${caseNumber || "N/A"}).`,
      metadata: { caseNumber },
    });
  }

  async logCourtInfoUpdated(caseId: string, caseNumber: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.COURT_INFO_UPDATED,
      description: `Updated Court Case Registry (Ref: ${caseNumber || "N/A"}).`,
      metadata: { caseNumber },
    });
  }

  async logCourtInfoDeleted(caseId: string, caseNumber: string) {
    return this.repository.create({
      caseId,
      activityType: ActivityType.COURT_INFO_DELETED,
      description: `Removed Court Case Registry (Ref: ${caseNumber || "N/A"}).`,
      metadata: { caseNumber },
    });
  }
}

export const activityService = new ActivityService();
export default activityService;

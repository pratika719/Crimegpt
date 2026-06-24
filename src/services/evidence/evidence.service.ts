import { evidenceRepository } from "@/repositories/evidence.repository";
import { CreateEvidenceSchema, CreateEvidenceInput, UpdateEvidenceSchema, UpdateEvidenceInput } from "@/schema/evidence.schema";
import { activityService } from "@/services/activity/activity.service";

export class EvidenceService {
  private repository = evidenceRepository;

  /**
   * Registers a new evidence item. Validates metadata and logs EVIDENCE_ADDED timeline log.
   */
  async createEvidence(caseId: string, userId: string, input: Omit<CreateEvidenceInput, "caseId">) {
    const parsed = CreateEvidenceSchema.parse({
      ...input,
      caseId,
    });

    console.log(`💼 [EvidenceService] Registering evidence "${parsed.title}" for case: ${caseId} by user: ${userId}`);
    const result = await this.repository.create(caseId, userId, parsed);
    
    // Log timeline activity
    await activityService.logEvidenceAdded(caseId, userId, result.title, result.type);
    
    return result;
  }

  /**
   * Retrieves an evidence item by ID. Throws error if not found or unauthorized.
   */
  async getEvidenceById(id: string, userId: string, caseId?: string) {
    const evidence = await this.repository.findById(id, userId, caseId);
    if (!evidence) {
      throw new Error("Evidence record not found or access denied.");
    }
    return evidence;
  }

  /**
   * Retrieves all evidence registered under a case.
   */
  async getEvidenceByCaseId(caseId: string, userId: string) {
    return this.repository.findByCaseId(caseId, userId);
  }

  /**
   * Updates details for an evidence item. Validates input and logs EVIDENCE_UPDATED timeline log.
   */
  async updateEvidence(id: string, userId: string, input: UpdateEvidenceInput, caseId?: string) {
    const parsed = UpdateEvidenceSchema.parse(input);
    const existing = await this.getEvidenceById(id, userId, caseId);

    console.log(`💼 [EvidenceService] Updating evidence details for ID: ${id} by user: ${userId}`);
    const result = await this.repository.update(id, userId, parsed, caseId);
    
    // Log timeline activity
    await activityService.logEvidenceUpdated(existing.caseId, userId, result.title, result.type);
    
    return result;
  }

  /**
   * Deletes an evidence item. Logs EVIDENCE_DELETED timeline log.
   */
  async deleteEvidence(id: string, userId: string, caseId?: string) {
    const existing = await this.getEvidenceById(id, userId, caseId);
    
    console.log(`💼 [EvidenceService] Deleting evidence record: ${existing.title} (ID: ${id}) by user: ${userId}`);
    const result = await this.repository.delete(id, userId, caseId);
    
    // Log timeline activity
    await activityService.logEvidenceDeleted(existing.caseId, userId, existing.title, existing.type);
    
    return result;
  }
}

export const evidenceService = new EvidenceService();
export default evidenceService;

import { caseMetadataRepository } from "@/repositories/case-metadata.repository";
import { CreateCaseMetadataSchema, CreateCaseMetadataInput } from "@/schema/case-metadata.schema";
import { activityService } from "@/services/activity/activity.service";

export class CaseMetadataService {
  private repository = caseMetadataRepository;

  /**
   * Saves or updates (upserts) the metadata profile for a case.
   * Runs schema validation.
   */
  async upsertMetadata(caseId: string, userId: string, input: Omit<CreateCaseMetadataInput, "caseId">) {
    // Validate schema
    const parsed = CreateCaseMetadataSchema.parse({
      ...input,
      caseId,
    });

    console.log(`💼 [CaseMetadataService] Upserting metadata for case ID: ${caseId} by user: ${userId}`);
    
    // Check if metadata profile already exists
    const existing = await this.repository.findByCaseId(caseId, userId);

    // Convert incidentDate string/date union into a real Date object or null
    const finalIncidentDate = parsed.incidentDate ? new Date(parsed.incidentDate) : null;

    // Extract validated fields (excluding caseId for relation updates)
    const { caseId: _, incidentDate: __, ...data } = parsed;

    const result = await this.repository.upsert(caseId, userId, {
      ...data,
      incidentDate: finalIncidentDate,
    });

    // Log the corresponding activity
    if (existing) {
      await activityService.logMetadataUpdated(caseId, userId);
    } else {
      await activityService.logMetadataCreated(caseId, userId);
    }

    return result;
  }

  /**
   * Retrieves case metadata by case ID.
   */
  async getMetadata(caseId: string, userId: string) {
    console.log(`💼 [CaseMetadataService] Fetching metadata for case ID: ${caseId} by user: ${userId}`);
    if (!caseId) {
      throw new Error("Case ID is required.");
    }
    return this.repository.findByCaseId(caseId, userId);
  }
}

export const caseMetadataService = new CaseMetadataService();
export default caseMetadataService;

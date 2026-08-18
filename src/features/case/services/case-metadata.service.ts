import { caseMetadataRepository } from "@/features/case/repositories/case-metadata.repository";
import { CreateCaseMetadataSchema, CreateCaseMetadataInput } from "@/features/case/schemas/case-metadata.schema";
import { activityService } from "@/features/case/services/activity.service";
import { logger } from "@/lib/logger";

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

    logger.info({ caseId, userId }, "[CaseMetadataService] Upserting metadata");
    
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
    logger.info({ caseId, userId }, "[CaseMetadataService] Fetching metadata");
    if (!caseId) {
      throw new Error("Case ID is required.");
    }
    return this.repository.findByCaseId(caseId, userId);
  }
}

export const caseMetadataService = new CaseMetadataService();
export default caseMetadataService;

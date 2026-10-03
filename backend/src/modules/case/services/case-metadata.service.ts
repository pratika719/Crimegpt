import { Injectable, Logger } from '@nestjs/common';
import { CaseMetadataRepository } from '../repositories/case-metadata.repository';
import { ActivityService } from './activity.service';

@Injectable()
export class CaseMetadataService {
  private readonly logger = new Logger(CaseMetadataService.name);

  constructor(
    private readonly repository: CaseMetadataRepository,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Gets or creates case metadata. Initializes with default values if new.
   */
  async getOrCreateMetadata(caseId: string) {
    return this.repository.findOrCreate(caseId);
  }

  /**
   * Updates case metadata with new values.
   */
  async updateMetadata(
    caseId: string,
    userId: string,
    data: {
      incidentDate?: Date;
      incidentTime?: string;
      incidentLocation?: string;
      victimName?: string;
      victimStatement?: string;
      suspectName?: string;
      suspectDescription?: string;
      witnessInformation?: string;
      evidenceSummary?: string;
      officerNotes?: string;
      dateOfIncident?: Date;
    },
  ) {
    this.logger.log({ caseId, userId }, 'Updating case metadata');

    // Ensure metadata exists
    await this.repository.findOrCreate(caseId);

    const result = await this.repository.update(caseId, data);

    // Log activity
    await this.activityService.logMetadataUpdated(caseId, userId);

    return result;
  }

  /**
   * Gets case metadata by case ID.
   */
  async getMetadataByCaseId(caseId: string) {
    return this.repository.findByCaseId(caseId);
  }
}

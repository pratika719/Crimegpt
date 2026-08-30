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
  async getOrCreateMetadata(caseId: string, userId: string) {
    return this.repository.findOrCreate(caseId, userId);
  }

  /**
   * Updates case metadata with new values.
   */
  async updateMetadata(
    caseId: string,
    userId: string,
    data: {
      firNumber?: string;
      policeStation?: string;
      district?: string;
      state?: string;
      ipcSections?: string[];
      dateOfIncident?: Date;
      dateOfFiling?: Date;
    },
  ) {
    this.logger.log({ caseId, userId }, 'Updating case metadata');

    // Ensure metadata exists
    await this.repository.findOrCreate(caseId, userId);

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

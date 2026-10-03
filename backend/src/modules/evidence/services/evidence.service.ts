import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EvidenceRepository } from '../repositories/evidence.repository';
import { ActivityService } from '@/modules/case/services/activity.service';
import { EvidenceType } from '@prisma/client';

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    private readonly repository: EvidenceRepository,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Registers a new evidence item. Validates metadata and logs EVIDENCE_ADDED timeline log.
   */
  async createEvidence(
    caseId: string,
    userId: string,
    input: {
      title: string;
      type: EvidenceType;
      description?: string;
      notes?: string;
      fileUrl?: string;
      storageKey?: string;
      mimeType?: string;
      fileSize?: number;
      fileSizeBytes?: number;
    },
  ) {
    this.logger.log({ caseId, userId, title: input.title }, 'Registering evidence');
    const result = await this.repository.create(caseId, userId, input);

    // Log timeline activity
    await this.activityService.logEvidenceAdded(caseId, userId, result.title, result.type);

    return result;
  }

  /**
   * Retrieves an evidence item by ID. Throws error if not found or unauthorized.
   */
  async getEvidenceById(id: string, userId: string, caseId?: string) {
    const evidence = await this.repository.findById(id, userId, caseId);
    if (!evidence) {
      throw new NotFoundException('Evidence record not found or access denied.');
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
  async updateEvidence(
    id: string,
    userId: string,
    input: {
      title?: string;
      type?: EvidenceType;
      description?: string;
      notes?: string;
      fileUrl?: string;
      storageKey?: string;
      mimeType?: string;
      fileSize?: number;
      fileSizeBytes?: number;
    },
    caseId?: string,
  ) {
    const existing = await this.getEvidenceById(id, userId, caseId);

    this.logger.log({ id, userId }, 'Updating evidence details');
    const result = await this.repository.update(id, userId, input, caseId);

    // Log timeline activity
    await this.activityService.logEvidenceUpdated(existing.caseId, userId, result.title, result.type);

    return result;
  }

  /**
   * Deletes an evidence item. Logs EVIDENCE_DELETED timeline log.
   */
  async deleteEvidence(id: string, userId: string, caseId?: string) {
    const existing = await this.getEvidenceById(id, userId, caseId);

    this.logger.log({ id, userId, title: existing.title }, 'Deleting evidence record');
    const result = await this.repository.delete(id, userId, caseId);

    // Log timeline activity
    await this.activityService.logEvidenceDeleted(existing.caseId, userId, existing.title, existing.type);

    return result;
  }
}

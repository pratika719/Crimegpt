import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CaseRepository } from '../repositories/case.repository';
import { ActivityService } from './activity.service';
import { CacheService } from '../../cache/cache.service';
import { CacheKeysService } from '../../cache/cache-keys.service';
import { CaseStatus } from '@/generated/prisma/client';

@Injectable()
export class CaseService {
  private readonly logger = new Logger(CaseService.name);

  constructor(
    private readonly repository: CaseRepository,
    private readonly activityService: ActivityService,
    private readonly cacheService: CacheService,
    private readonly cacheKeys: CacheKeysService,
  ) {}

  async createCase(userId: string, input: { title: string; narrative: string }) {
    const caseItem = await this.repository.create(userId, input);
    await this.activityService.logCaseCreated(caseItem.id, userId, caseItem.title);
    return caseItem;
  }

  async getCases(userId: string) {
    return this.cacheService.getOrSet(
      this.cacheKeys.caseDashboard(userId),
      60,
      () => this.repository.findAll(userId),
    );
  }

  async getCaseById(id: string, userId: string) {
    const found = await this.cacheService.getOrSet(
      this.cacheKeys.caseDetail(userId, id),
      30,
      () => this.repository.findById(id, userId),
    );

    if (!found) {
      throw new NotFoundException('Case not found');
    }

    return found;
  }

  async updateCase(id: string, userId: string, input: { title?: string; narrative?: string; status?: CaseStatus }) {
    // Get existing case to build a meaningful activity description
    const existing = await this.getCaseById(id, userId);

    this.logger.log({ caseId: id, userId }, 'Updating case');
    const result = await this.repository.update(id, userId, input);

    // Build change description for activity log
    const changes: string[] = [];
    if (input.title && input.title !== existing.title) changes.push('title');
    if (input.narrative && input.narrative !== existing.narrative) changes.push('narrative');
    if (input.status && input.status !== existing.status) changes.push(`status → ${input.status}`);

    if (changes.length > 0) {3
    }

    return result;
  }

  async deleteCase(id: string, userId: string) {
    // Verify ownership before deletion
    const existing = await this.getCaseById(id, userId);

    this.logger.log({ caseId: id, userId, title: existing.title }, 'Deleting case');

    // Clear cache
    await this.cacheService.del(this.cacheKeys.caseDetail(userId, id));
    await this.cacheService.del(this.cacheKeys.caseDashboard(userId));

    return this.repository.delete(id, userId);
  }
}

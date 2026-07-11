import {
  CreateCaseInput,
  UpdateCaseSchema,
  UpdateCaseInput,
} from "@/schema/case.schema";

import { CaseRepository } from "@/repositories/case.repository";
import { activityService } from "@/services/activity/activity.service";
import { cacheService } from "@/lib/cache/cache";
import { cacheKeys } from "@/lib/cache/cache-keys";
import { logger } from "@/lib/logger";

export class CaseService {
  private repository = new CaseRepository();

  async createCase(
    userId: string,
    input: CreateCaseInput
  ) {
    const caseItem = await this.repository.create(userId, input);
    await activityService.logCaseCreated(caseItem.id, userId, caseItem.title);
    return caseItem;
  }

  async getCases(userId: string) {
    return cacheService.getOrSet(
      cacheKeys.caseDashboard(userId),
      60,
      () => this.repository.findAll(userId)
    );
  }

  async getCaseById(id: string, userId: string) {
    const found = await cacheService.getOrSet(
      cacheKeys.caseDetail(userId, id),
      30,
      () => this.repository.findById(id, userId)
    );

    if (!found) {
      throw new Error(
        "Case not found"
      );
    }

    return found;
  }

  async updateCase(id: string, userId: string, input: UpdateCaseInput) {
    const parsed = UpdateCaseSchema.parse(input);

    // Get existing case to build a meaningful activity description
    const existing = await this.getCaseById(id, userId);

    logger.info({ caseId: id, userId }, "Updating case");
    const result = await this.repository.update(id, userId, parsed);

    // Build change description for activity log
    const changes: string[] = [];
    if (parsed.title && parsed.title !== existing.title) changes.push("title");
    if (parsed.narrative && parsed.narrative !== existing.narrative) changes.push("narrative");
    if (parsed.status && parsed.status !== existing.status) changes.push(`status → ${parsed.status}`);

    if (changes.length > 0) {
      await activityService.logCaseUpdated(id, userId, changes.join(", "));
    }

    return result;
  }

  async deleteCase(id: string, userId: string) {
    // Verify ownership before deletion
    const existing = await this.getCaseById(id, userId);

    logger.info({ caseId: id, userId, title: existing.title }, "Deleting case");

    return this.repository.delete(id, userId);
  }
}
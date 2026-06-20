import {
  CreateCaseInput,
  UpdateCaseSchema,
  UpdateCaseInput,
} from "@/schema/case.schema";

import { CaseRepository } from "@/repositories/case.repository";
import { activityService } from "@/services/activity/activity.service";

export class CaseService {
  private repository =
    new CaseRepository();

  async createCase(
    userId: string,
    input: CreateCaseInput
  ) {
    const caseItem = await this.repository.create(userId, input);
    await activityService.logCaseCreated(caseItem.id, caseItem.title);
    return caseItem;
  }

  async getCases(userId: string) {
    return this.repository.findAll(userId);
  }

  async getCaseById(id: string, userId: string) {
    const found =
      await this.repository.findById(id, userId);

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

    console.log(`💼 [CaseService] Updating case ID: ${id} by user: ${userId}`);
    const result = await this.repository.update(id, userId, parsed);

    // Build change description for activity log
    const changes: string[] = [];
    if (parsed.title && parsed.title !== existing.title) changes.push("title");
    if (parsed.narrative && parsed.narrative !== existing.narrative) changes.push("narrative");
    if (parsed.status && parsed.status !== existing.status) changes.push(`status → ${parsed.status}`);

    if (changes.length > 0) {
      await activityService.logCaseUpdated(id, changes.join(", "));
    }

    return result;
  }

  async deleteCase(id: string, userId: string) {
    // Verify ownership before deletion
    const existing = await this.getCaseById(id, userId);

    console.log(`💼 [CaseService] Deleting case: ${existing.title} (ID: ${id}) by user: ${userId}`);

    // Note: Activity logs are cascade-deleted with the case,
    // so logging CASE_DELETED here would be pointless.
    return this.repository.delete(id, userId);
  }
}
import {
  CreateCaseInput,
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
}
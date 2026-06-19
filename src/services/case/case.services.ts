import {
  CreateCaseInput,
} from "@/schema/case.schema";

import { CaseRepository } from "@/repositories/case.repository";
import { activityService } from "@/services/activity/activity.service";

export class CaseService {
  private repository =
    new CaseRepository();

  async createCase(
    input: CreateCaseInput
  ) {
    const caseItem = await this.repository.create(input);
    await activityService.logCaseCreated(caseItem.id, caseItem.title);
    return caseItem;
  }

  async getCases() {
    return this.repository.findAll();
  }

  async getCaseById(id: string) {
    const found =
      await this.repository.findById(id);

    if (!found) {
      throw new Error(
        "Case not found"
      );
    }

    return found;
  }
}
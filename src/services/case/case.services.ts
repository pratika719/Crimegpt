import {
  CreateCaseInput,
} from "@/schema/case.schema";

import { CaseRepository } from "@/repositories/case.repository";

export class CaseService {
  private repository =
    new CaseRepository();

  async createCase(
    input: CreateCaseInput
  ) {
    return this.repository.create(input);
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
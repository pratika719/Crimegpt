import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/generated/prisma/client";

export class CaseActivityRepository {
  private async checkCaseOwnership(caseId: string, userId: string) {
    const c = await prisma.case.findFirst({
      where: { id: caseId, userId },
    });
    if (!c) {
      throw new Error("Unauthorized: Case not found or access denied.");
    }
  }

  /**
   * Creates a new case activity entry.
   * This is triggered internally by services that have already validated case ownership.
   */
  async create(data: {
    caseId: string;
    activityType: ActivityType;
    description: string;
    metadata?: any;
  }) {
    return prisma.caseActivity.create({
      data,
    });
  }

  /**
   * Finds all activities associated with a case, sorted by newest first.
   */
  async findByCaseId(caseId: string, userId: string) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.caseActivity.findMany({
      where: {
        caseId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string, caseId: string, userId: string) {
    return prisma.caseActivity.findFirst({
      where: {
        id,
        caseId,
        case: { userId },
      },
    });
  }

  async update(
    id: string,
    caseId: string,
    userId: string,
    data: {
      description: string;
      metadata?: any;
    }
  ) {
    const existing = await this.findById(id, caseId, userId);
    if (!existing) {
      throw new Error("Unauthorized: Timeline event not found or access denied.");
    }

    return prisma.caseActivity.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, caseId: string, userId: string) {
    const existing = await this.findById(id, caseId, userId);
    if (!existing) {
      throw new Error("Unauthorized: Timeline event not found or access denied.");
    }

    return prisma.caseActivity.delete({
      where: { id },
    });
  }

  /**
   * Finds the latest activities for a case.
   */
  async findLatest(caseId: string, userId: string, limit = 5) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.caseActivity.findMany({
      where: {
        caseId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }
}

export const caseActivityRepository = new CaseActivityRepository();
export default caseActivityRepository;

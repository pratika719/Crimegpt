import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/generated/prisma/client";

export class CaseActivityRepository {
  private async checkCaseOwnership(caseId: string, userId: string, tx?: any) {
    const client = tx || prisma;
    const c = await client.case.findFirst({
      where: { id: caseId, userId },
    });
    if (!c) {
      throw new Error("Unauthorized: Case not found or access denied.");
    }
  }

  async create(data: {
    caseId: string;
    activityType: ActivityType;
    description: string;
    metadata?: any;
    userId: string;
  }, tx?: any) {
    await this.checkCaseOwnership(data.caseId, data.userId, tx);

    const { userId, ...activityData } = data;
    const client = tx || prisma;
    return client.caseActivity.create({
      data: activityData,
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

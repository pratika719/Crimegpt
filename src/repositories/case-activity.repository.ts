import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/generated/prisma/client";

export class CaseActivityRepository {
  /**
   * Creates a new case activity entry.
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
  async findByCaseId(caseId: string) {
    return prisma.caseActivity.findMany({
      where: {
        caseId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Finds the latest activities for a case.
   */
  async findLatest(caseId: string, limit = 5) {
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

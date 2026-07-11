import { cacheService } from "@/lib/cache/cache";
import { cacheKeys } from "@/lib/cache/cache-keys";

export class CacheInvalidationService {
  async invalidateCaseDashboard(userId: string): Promise<void> {
    await cacheService.del(cacheKeys.caseDashboard(userId));
  }

  async invalidateCaseDetail(userId: string, caseId: string): Promise<void> {
    await cacheService.delMany([
      cacheKeys.caseDetail(userId, caseId),
      cacheKeys.caseDashboard(userId),
      cacheKeys.aiSummary(caseId),
    ]);
  }

  async invalidateCaseSearch(userId: string): Promise<void> {
    await cacheService.delPattern(`cache:case-search:${userId}:*`);
  }

  async invalidateCaseMutation(input: {
    userId: string;
    caseId: string;
  }): Promise<void> {
    await Promise.all([
      this.invalidateCaseDetail(input.userId, input.caseId),
      this.invalidateCaseDashboard(input.userId),
      this.invalidateCaseSearch(input.userId),
    ]);
  }
}

export const cacheInvalidationService = new CacheInvalidationService();

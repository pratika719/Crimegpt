/**
 * Cache Invalidation Service — clears caches after job completion.
 *
 * Ensures stale data is removed after mutations.
 * All operations are fire-and-forget: failures are logged but never abort.
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService, CacheKeysService } from '@/common/cache';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly cacheKeys: CacheKeysService,
  ) {}

  /**
   * Invalidate all caches related to a case mutation.
   */
  async invalidateCaseMutation(params: {
    userId: string;
    caseId: string;
  }): Promise<void> {
    try {
      // Invalidate case detail cache
      const detailKey = this.cacheKeys.caseDetail(
        params.userId,
        params.caseId,
      );
      await this.cache.del(detailKey);

      // Invalidate case list cache
      const listKey = this.cacheKeys.caseDashboard(params.userId);
      await this.cache.del(listKey);

      this.logger.debug(
        { userId: params.userId, caseId: params.caseId },
        'Cache invalidated after mutation',
      );
    } catch (err) {
      this.logger.warn(
        { err, caseId: params.caseId },
        'Cache invalidation failed — non-fatal',
      );
    }
  }
}

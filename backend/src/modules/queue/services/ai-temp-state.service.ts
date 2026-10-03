/**
 * AI Temp State Service — writes progress state to Redis.
 *
 * Enables real-time UI updates via polling.
 * All operations are fire-and-forget: failures are logged but never abort.
 */

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis';
import { AI_TEMP_STATE_TTL_SECONDS, AI_TEMP_STATE_KEY_PREFIX } from '../constants/queue.constants';
import type { AiTempStateParams } from '../types/processor.types';

@Injectable()
export class AiTempStateService {
  private readonly logger = new Logger(AiTempStateService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Write AI temp state to Redis with TTL.
   */
  async write(params: AiTempStateParams): Promise<void> {
    try {
      const key = `${AI_TEMP_STATE_KEY_PREFIX}:${params.requestId}`;
      const client = this.redis.getClient();

      await client.set(
        key,
        JSON.stringify({
          ...params,
          updatedAt: new Date().toISOString(),
        }),
        'EX',
        AI_TEMP_STATE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        { err, requestId: params.requestId },
        'Failed to write AI temp state — non-fatal',
      );
    }
  }

  /**
   * Read AI temp state from Redis.
   */
  async read(requestId: string): Promise<AiTempStateParams | null> {
    try {
      const key = `${AI_TEMP_STATE_KEY_PREFIX}:${requestId}`;
      const client = this.redis.getClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      this.logger.warn(
        { err, requestId },
        'Failed to read AI temp state — non-fatal',
      );
      return null;
    }
  }
}

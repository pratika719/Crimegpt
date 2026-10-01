import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { RedisService } from '../../redis/redis.service';

const DEFAULT_LOCK_TTL_MS = 240_000; // 4 minutes

@Injectable()
export class DocumentLockService {
  private readonly logger = new Logger(DocumentLockService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Acquires a distributed lock using Redis SET NX PX.
   * Returns a unique token string if acquired, or null if lock is already held.
   */
  async acquireLock(key: string, ttlMs: number = DEFAULT_LOCK_TTL_MS): Promise<string | null> {
    const client = this.redis.getClient();
    const token = crypto.randomUUID();
    const result = await client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  /**
   * Releases a distributed lock safely using a Lua script to ensure
   * only the token owner can release it.
   */
  async releaseLock(key: string, token: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      const script = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end`;
      await client.eval(script, 1, key, token);
    } catch (err) {
      this.logger.warn({ err, key }, 'Failed to release Redis lock');
    }
  }

  /**
   * Executes an async action wrapped inside a distributed lock.
   */
  async withLock<T>(
    caseId: string,
    type: string,
    action: () => Promise<T>,
    ttlMs: number = DEFAULT_LOCK_TTL_MS,
  ): Promise<T> {
    const lockKey = `lock:doc-gen:${caseId}:${type}`;
    const token = await this.acquireLock(lockKey, ttlMs);
    if (!token) {
      throw new Error('Document generation is already in progress for this case and type.');
    }

    try {
      return await action();
    } finally {
      await this.releaseLock(lockKey, token);
    }
  }
}

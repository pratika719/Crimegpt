import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.redis.getClient();
      const value = await client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Failed to get cache key ${key}: ${error}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Failed to set cache key ${key}: ${error}`);
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();

    // Don't cache empty arrays — prevents stale retries
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (!isEmptyArray) {
      await this.set(key, value, ttlSeconds);
    }

    return value;
  }

  async del(key: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.del(key);
    } catch (error) {
      this.logger.warn(`Failed to delete cache key ${key}: ${error}`);
    }
  }

  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      const client = this.redis.getClient();
      await client.del(...keys);
    } catch (error) {
      this.logger.warn(`Failed to delete cache keys: ${error}`);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(`Failed to delete pattern ${pattern}: ${error}`);
    }
  }
}

import { connectRedis } from "@/lib/redis/redis";

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = await connectRedis();
      const value = await redis.get(key);

      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        // If JSON parse fails, delete corrupted cache key and return null
        await redis.del(key);
        return null;
      }
    } catch (error) {
      console.warn(`[CacheService] Failed to get key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      throw new Error("Cache TTL must be greater than zero.");
    }

    try {
      const redis = await connectRedis();
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      console.warn(`[CacheService] Failed to set key ${key}:`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();

    await this.set(key, value, ttlSeconds);

    return value;
  }

  async del(key: string): Promise<void> {
    try {
      const redis = await connectRedis();
      await redis.del(key);
    } catch (error) {
      console.warn(`[CacheService] Failed to delete key ${key}:`, error);
    }
  }

  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      const redis = await connectRedis();
      await redis.del(...keys);
    } catch (error) {
      console.warn(`[CacheService] Failed to delete keys ${keys.join(", ")}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const redis = await connectRedis();
      let cursor = "0";

      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      console.warn(`[CacheService] Failed to delete pattern ${pattern}:`, error);
    }
  }
}

export const cacheService = new CacheService();

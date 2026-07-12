import { connectRedis } from "@/lib/redis";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
  count: number;
};

export async function checkRateLimit(input: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const redis = await connectRedis();

  // Use MULTI/EXEC to atomically INCR and EXPIRE on first increment
  // This avoids a race condition where two concurrent requests both get count === 1
  // and both set EXPIRE (the second one overriding with the same TTL — harmless but wasteful).
  const count = await redis.incr(input.key);

  if (count === 1) {
    await redis.expire(input.key, input.windowSeconds);
  }

  const ttl = await redis.ttl(input.key);

  return {
    allowed: count <= input.limit,
    limit: input.limit,
    remaining: Math.max(input.limit - count, 0),
    resetInSeconds: ttl > 0 ? ttl : input.windowSeconds,
    count,
  };
}

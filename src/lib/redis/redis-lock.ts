import crypto from "node:crypto";
import { connectRedis } from "./redis";

export type AcquiredRedisLock = {
  key: string;
  token: string;
  release: () => Promise<boolean>;
};

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

export async function acquireRedisLock(
  key: string,
  ttlMs = 60_000,
): Promise<AcquiredRedisLock | null> {
  const redis = await connectRedis();
  const token = crypto.randomUUID();

  const result = await redis.set(key, token, "PX", ttlMs, "NX");

  if (result !== "OK") {
    return null;
  }

  return {
    key,
    token,
    release: async () => {
      const releaseResult = await redis.eval(RELEASE_LOCK_SCRIPT, 1, key, token);

      return releaseResult === 1;
    },
  };
}

export async function withRedisLock<T>(
  key: string,
  ttlMs: number,
  operation: () => Promise<T>,
): Promise<T> {
  const lock = await acquireRedisLock(key, ttlMs);

  if (!lock) {
    throw new Error("Resource is locked. Another operation is already running.");
  }

  try {
    return await operation();
  } finally {
    await lock.release();
  }
}
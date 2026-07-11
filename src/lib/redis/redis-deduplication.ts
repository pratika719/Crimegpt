import crypto from "node:crypto";
import { connectRedis } from "./redis";
import { redisKeys } from "@/lib/redis/redis-keys";

export function createStableHash(input: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(sortObject(input)))
    .digest("hex");
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export async function markRequestIfNew(
  inputHash: string,
  ttlSeconds = 300,
): Promise<boolean> {
  const redis = await connectRedis();

  const result = await redis.set(
    redisKeys.dedupe.aiRequest(inputHash),
    "1",
    "EX",
    ttlSeconds,
    "NX",
  );

  return result === "OK";
}

export async function clearRequestDedupe(inputHash: string): Promise<void> {
  const redis = await connectRedis();

  await redis.del(redisKeys.dedupe.aiRequest(inputHash));
}
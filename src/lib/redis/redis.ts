// src/lib/redis/connection.ts

import IORedis from "ioredis";


const globalForRedis = globalThis as unknown as {
  redisConnection?: IORedis;
};

function getRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured.");
  }

  return redisUrl;
}

export function getRedisConnection(): IORedis {
  if (!globalForRedis.redisConnection) {
    const redisUrl = getRedisUrl();

    globalForRedis.redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    });

    globalForRedis.redisConnection.on("error", (error) => {
      console.error("[redis] connection error", error);
    });
  }

  return globalForRedis.redisConnection;
}

export async function connectRedis(): Promise<IORedis> {
  const redis = getRedisConnection();

  if (redis.status === "wait") {
    await redis.connect();
  }

  return redis;
}

export async function pingRedis(): Promise<"ok" | "error"> {
  try {
    const redis = await connectRedis();
    const pong = await redis.ping();

    return pong === "PONG" ? "ok" : "error";
  } catch {
    return "error";
  }
}
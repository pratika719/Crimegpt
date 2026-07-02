import { createClient, type RedisClientType } from "redis";

const globalForRedis = globalThis as unknown as {
  redisClient?: RedisClientType;
  redisConnecting?: Promise<RedisClientType>;
};

function getRedisUrl() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured.");
  }

  return redisUrl;
}

export function getRedisClient(): RedisClientType {
  if (!globalForRedis.redisClient) {
    globalForRedis.redisClient = createClient({
      url: getRedisUrl(),
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error("Redis reconnect attempts exceeded.");
          }

          return Math.min(retries * 100, 3_000);
        },
      },
    });

    globalForRedis.redisClient.on("error", (error) => {
      console.error("[redis] connection error", error);
    });
  }

  return globalForRedis.redisClient;
}

export async function connectRedis(): Promise<RedisClientType> {
  const client = getRedisClient();

  if (client.isOpen) {
    return client;
  }

  if (!globalForRedis.redisConnecting) {
    globalForRedis.redisConnecting = client.connect().then(() => client);
  }

  return globalForRedis.redisConnecting;
}

export async function disconnectRedis() {
  const client = getRedisClient();

  if (client.isOpen) {
    await client.quit();
  }

  globalForRedis.redisConnecting = undefined;
}
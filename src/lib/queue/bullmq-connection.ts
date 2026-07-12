import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();
const globalForBullMQ = globalThis as unknown as {
  bullmqConnection?: IORedis;
};


function getBullMQRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;

  if (!redisUrl) {
    // Prevent Next.js compilation crashes during build if environment variables are not supplied
    throw new Error("REDIS_URL is not configured.");
  }

  return redisUrl;
}

export function getBullMQConnection(): IORedis {
  if (!globalForBullMQ.bullmqConnection) {
    globalForBullMQ.bullmqConnection = new IORedis(getBullMQRedisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      tls: getBullMQRedisUrl().startsWith("rediss://") ? {} : undefined,
    })

    globalForBullMQ.bullmqConnection.on("error", (error) => {
      console.error("[bullmq-redis] connection error", error);
    });
  }

  return globalForBullMQ.bullmqConnection;
}

export async function connectBullMQRedis(): Promise<IORedis> {
  const connection = getBullMQConnection();

  if (connection.status === "wait") {
    await connection.connect();
  }

  return connection;
}

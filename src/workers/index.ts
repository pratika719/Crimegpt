import "dotenv/config";
process.env.SERVICE_NAME = "crimegpt-worker";

import { logger } from "@/lib/logger";
import { closeWorkers, createWorkers } from "@/workers/worker-registry";
import { getRedisConnection } from "@/lib/redis";

logger.info("CrimeGPT workers starting...");
const workers = createWorkers();

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.info({ signal }, "Worker runtime received shutdown signal. Starting graceful shutdown.");

  try {
    await closeWorkers(workers);

    const redis = getRedisConnection();
    await redis.quit();

    logger.info("Worker runtime shutdown complete.");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Worker runtime shutdown failed.");
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("uncaughtException", async (error) => {
  logger.fatal({ err: error }, "Worker runtime uncaught exception.");
  await shutdown("SIGTERM");
});

process.on("unhandledRejection", async (reason) => {
  logger.fatal({ err: reason }, "Worker runtime unhandled rejection.");
  await shutdown("SIGTERM");
});

logger.info("CrimeGPT workers started.");
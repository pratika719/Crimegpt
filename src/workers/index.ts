import "dotenv/config";
import { closeWorkers, createWorkers } from "@/workers/worker-registry";
import { getRedisConnection } from "@/lib/redis";


const workers = createWorkers();

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.info(`[worker-runtime] received ${signal}. Starting graceful shutdown.`);

  try {
    await closeWorkers(workers);

    const redis = getRedisConnection();
    await redis.quit();

    console.info("[worker-runtime] shutdown complete.");
    process.exit(0);
  } catch (error) {
    console.error("[worker-runtime] shutdown failed.", error);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("uncaughtException", async (error) => {
  console.error("[worker-runtime] uncaught exception.", error);
  await shutdown("SIGTERM");
});

process.on("unhandledRejection", async (reason) => {
  console.error("[worker-runtime] unhandled rejection.", reason);
  await shutdown("SIGTERM");
});

console.info("[worker-runtime] CrimeGPT workers started.");
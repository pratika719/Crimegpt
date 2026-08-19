import "dotenv/config";
process.env.SERVICE_NAME = "crimegpt-worker";

import http from "node:http";
import { logger } from "@/lib/logger";
import { closeWorkers, createWorkers } from "@/workers/worker-registry";
import { getRedisConnection, pingRedis } from "@/lib/redis";

logger.info("CrimeGPT workers starting...");

const workers = createWorkers();
let isShuttingDown = false;

// ---------------------------------------------------------------------------
// Health & Readiness Server
// ---------------------------------------------------------------------------
const healthPort = Number(process.env.PORT || 10000);

const healthServer = http.createServer(async (req, res) => {
  // If pod/process is draining, fail all probes to disconnect orchestrators
  if (isShuttingDown) {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "shutting_down" }));
    return;
  }

  // Liveness probe
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: process.env.SERVICE_NAME ?? "crimegpt-worker",
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Readiness probe
  if (req.url === "/ready") {
    try {
      const redisOk = (await pingRedis()) === "ok";

      if (!redisOk) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "not_ready", reason: "Redis not reachable" }));
        return;
      }

      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          ready: true,
          service: process.env.SERVICE_NAME ?? "crimegpt-worker",
          timestamp: new Date().toISOString(),
        })
      );
      return;
    } catch {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "not_ready", reason: "Readiness check failed" }));
      return;
    }
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

healthServer.listen(healthPort, "0.0.0.0", () => {
  logger.info({ port: healthPort }, "Worker health server listening");
});

logger.info("CrimeGPT workers started.");

// ---------------------------------------------------------------------------
// Graceful Shutdown & Signal Handlers
// ---------------------------------------------------------------------------
async function shutdown(signal: NodeJS.Signals | string) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Worker runtime received shutdown signal. Starting graceful shutdown.");

  try {
    // 1. Stop taking new health requests
    await new Promise<void>((resolve) => healthServer.close(() => resolve()));

    // 2. Allow active jobs to finish and pause queue consumers
    await closeWorkers(workers);

    // 3. Gracefully close the Redis client
    const redis = getRedisConnection();
    await redis.quit();

    logger.info("Worker runtime shutdown complete.");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Worker runtime shutdown failed.");
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", async (error) => {
  logger.fatal({ err: error }, "Worker runtime uncaught exception.");
  await shutdown("uncaughtException");
});

process.on("unhandledRejection", async (reason) => {
  logger.fatal({ err: reason }, "Worker runtime unhandled rejection.");
  await shutdown("unhandledRejection");
});
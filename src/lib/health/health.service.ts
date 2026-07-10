import { prisma } from "@/lib/prisma";
import { getRedisConnection } from "@/lib/redis";
import type {
  HealthCheckResult,
  HealthResponse,
  HealthStatus,
} from "@/lib/health/health.types";

function getOverallStatus(
  checks: Record<string, HealthCheckResult>,
): HealthStatus {
  const statuses = Object.values(checks).map((check) => check.status);

  if (statuses.includes("failed")) {
    return "failed";
  }

  if (statuses.includes("degraded")) {
    return "degraded";
  }

  return "ok";
}

async function measure<T>(
  check: () => Promise<T>,
): Promise<{ result: T; latencyMs: number }> {
  const startedAt = Date.now();
  const result = await check();

  return {
    result,
    latencyMs: Date.now() - startedAt,
  };
}

export class HealthService {
  basic(): HealthResponse {
    const checks: Record<string, HealthCheckResult> = {
      app: {
        status: "ok",
        message: "Application is running.",
      },
    };

    return {
      status: "ok",
      service: process.env.SERVICE_NAME ?? "crimegpt-app",
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  checkEnv(): HealthCheckResult {
    const required = [
      "DATABASE_URL",
      "REDIS_URL",
      "AUTH_SECRET",
      "GEMINI_API_KEY",
      "EMBEDDING_SERVICE_URL",
      "EMBEDDING_PROVIDER",
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      return {
        status: "failed",
        message: "Missing required environment variables.",
        metadata: {
          missing,
        },
      };
    }

    return {
      status: "ok",
      message: "Required environment variables are configured.",
    };
  }

  checkEmbeddingProviderConfig(): HealthCheckResult {
    const provider = process.env.EMBEDDING_PROVIDER;

    if (provider !== "fastapi") {
      return {
        status: "failed",
        message: "Invalid embedding provider configuration.",
        metadata: {
          expected: "fastapi",
          actual: provider ?? null,
        },
      };
    }

    return {
      status: "ok",
      message: "Embedding provider is configured for FastAPI.",
      metadata: {
        provider,
      },
    };
  }

  async checkDatabase(): Promise<HealthCheckResult> {
    try {
      const { latencyMs } = await measure(async () => {
        await prisma.$queryRaw`SELECT 1`;
      });

      return {
        status: "ok",
        message: "PostgreSQL connection is healthy.",
        latencyMs,
      };
    } catch (error) {
      return {
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "PostgreSQL health check failed.",
      };
    }
  }

  async checkRedis(): Promise<HealthCheckResult> {
    try {
      const { result, latencyMs } = await measure(async () => {
        const redis = getRedisConnection();
        return redis.ping();
      });

      if (result !== "PONG") {
        return {
          status: "failed",
          message: "Redis did not return PONG.",
          latencyMs,
          metadata: { result },
        };
      }

      return {
        status: "ok",
        message: "Redis connection is healthy.",
        latencyMs,
      };
    } catch (error) {
      return {
        status: "failed",
        message:
          error instanceof Error ? error.message : "Redis health check failed.",
      };
    }
  }

  async checkFastAPI(): Promise<HealthCheckResult> {
    const serviceUrl = process.env.EMBEDDING_SERVICE_URL;

    if (!serviceUrl) {
      return {
        status: "failed",
        message: "EMBEDDING_SERVICE_URL is not configured.",
      };
    }

    try {
      const cleanUrl = serviceUrl.replace(/\/$/, "");

      const { result, latencyMs } = await measure(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5_000);

        try {
          const response = await fetch(`${cleanUrl}/health`, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`FastAPI health returned ${response.status}.`);
          }

          return response.json() as Promise<{
            status?: string;
            model?: string;
            dimensions?: number;
          }>;
        } finally {
          clearTimeout(timeout);
        }
      });

      return {
        status: result.status === "ok" ? "ok" : "degraded",
        message: "FastAPI embedding service is reachable.",
        latencyMs,
        metadata: {
          model: result.model,
          dimensions: result.dimensions,
        },
      };
    } catch (error) {
      return {
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "FastAPI health check failed.",
      };
    }
  }

  async checkPGVector(): Promise<HealthCheckResult> {
    try {
      const { result, latencyMs } = await measure(async () => {
        return prisma.$queryRaw<Array<{ extname: string }>>`
          SELECT extname
          FROM pg_extension
          WHERE extname = 'vector'
        `;
      });

      if (!result || result.length === 0) {
        return {
          status: "failed",
          message: "PGVector extension is not installed.",
          latencyMs,
        };
      }

      return {
        status: "ok",
        message: "PGVector extension is available.",
        latencyMs,
      };
    } catch (error) {
      return {
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "PGVector health check failed.",
      };
    }
  }

  async checkQueues(): Promise<HealthCheckResult> {
    try {
      const { documentGenerationQueue, embeddingQueue, ingestionQueue } =
        await import("@/lib/queue/queues");

      const { QUEUE_NAMES } = await import("@/lib/queue/queue-names");

      const { result, latencyMs } = await measure(async () => {
        const checks: Record<string, unknown> = {};

        if (documentGenerationQueue) {
          checks[QUEUE_NAMES.DOCUMENT_GENERATION] =
            await documentGenerationQueue.getJobCounts(
              "waiting",
              "active",
              "completed",
              "failed",
              "delayed",
            );
        }

        if (embeddingQueue) {
          checks[QUEUE_NAMES.EMBEDDING] = await embeddingQueue.getJobCounts(
            "waiting",
            "active",
            "completed",
            "failed",
            "delayed",
          );
        }

        if (ingestionQueue) {
          checks[QUEUE_NAMES.INGESTION] = await ingestionQueue.getJobCounts(
            "waiting",
            "active",
            "completed",
            "failed",
            "delayed",
          );
        }

        return checks;
      });

      return {
        status: "ok",
        message: "BullMQ queues are reachable.",
        latencyMs,
        metadata: result,
      };
    } catch (error) {
      return {
        status: "failed",
        message:
          error instanceof Error ? error.message : "Queue health check failed.",
      };
    }
  }

  checkGeminiConfig(): HealthCheckResult {
    if (!process.env.GEMINI_API_KEY) {
      return {
        status: "failed",
        message: "GEMINI_API_KEY is not configured.",
      };
    }

    return {
      status: "ok",
      message: "Gemini API key is configured.",
    };
  }

  async ready(): Promise<HealthResponse> {
    const checks: Record<string, HealthCheckResult> = {
      env: this.checkEnv(),
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      fastapi: await this.checkFastAPI(),
      embeddingProvider: this.checkEmbeddingProviderConfig(),
    };

    return {
      status: getOverallStatus(checks),
      service: process.env.SERVICE_NAME ?? "crimegpt-app",
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  async deep(): Promise<HealthResponse> {
    const checks: Record<string, HealthCheckResult> = {
      env: this.checkEnv(),
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      queues: await this.checkQueues(),
      fastapi: await this.checkFastAPI(),
      pgvector: await this.checkPGVector(),
      geminiConfig: this.checkGeminiConfig(),
      embeddingProvider: this.checkEmbeddingProviderConfig(),
    };

    return {
      status: getOverallStatus(checks),
      service: process.env.SERVICE_NAME ?? "crimegpt-app",
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}

export const healthService = new HealthService();

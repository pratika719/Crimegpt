import { Worker, type WorkerOptions } from "bullmq";
import { getRedisConnection } from "@/lib/redis";
import { QUEUE_NAMES } from "@/lib/queue/queue-names";
import { processAIGenerationJob } from "@/workers/ai-generation.processor";
import { processCleanupJob } from "@/workers/cleanup.processor";
import { processDocumentGenerationJob } from "@/workers/document-generator.processor";
import { processEmailJob } from "@/workers/email.proccessor";
import { processEmbeddingJob } from "@/workers/embedding.processor";
import { processIngestionJob } from "@/workers/ingestion.processor";
import { logger } from "@/lib/logger";
import { WORKER_CONCURRENCY } from "@/lib/worker/worker-concurrency";

const connection = getRedisConnection() as any;

const defaultWorkerOptions: WorkerOptions = {
  connection,
  concurrency: WORKER_CONCURRENCY.DOCUMENT_GENERATION,
  autorun: true,
  skipVersionCheck: true,
};

export function createWorkers() {
  const workers = [
    new Worker(
      QUEUE_NAMES.DOCUMENT_GENERATION,
      processDocumentGenerationJob,
      defaultWorkerOptions,
    ),

    new Worker(
      QUEUE_NAMES.AI_GENERATION,
      processAIGenerationJob,
      defaultWorkerOptions,
    ),

    new Worker(QUEUE_NAMES.EMBEDDING, processEmbeddingJob, {
      ...defaultWorkerOptions,
      concurrency: WORKER_CONCURRENCY.EMBEDDING,
    }),

    new Worker(QUEUE_NAMES.INGESTION, processIngestionJob, {
      ...defaultWorkerOptions,
      concurrency: WORKER_CONCURRENCY.INGESTION,
    }),

    new Worker(QUEUE_NAMES.EMAIL, processEmailJob, {
      ...defaultWorkerOptions,
      concurrency: WORKER_CONCURRENCY.EMAIL,
    }),

    new Worker(QUEUE_NAMES.CLEANUP, processCleanupJob, {
      ...defaultWorkerOptions,
      concurrency: WORKER_CONCURRENCY.CLEANUP,
    }),
  ];

  for (const worker of workers) {
    worker.on("ready", () => {
      logger.info({ queueName: worker.name }, "BullMQ worker ready");
    });

    worker.on("active", (job) => {
      logger.info(
        {
          jobId: job.id,
          queueName: worker.name,
        },
        "BullMQ job active",
      );
    });

    worker.on("completed", (job) => {
      logger.info(
        {
          jobId: job.id,
          queueName: worker.name,
        },
        "BullMQ job completed",
      );
    });

    worker.on("failed", (job, error) => {
      logger.error(
        {
          err: error,
          jobId: job?.id,
          queueName: worker.name,
          failedReason: job?.failedReason,
        },
        "BullMQ job failed",
      );
    });

    worker.on("error", (error) => {
      logger.error({ err: error, queueName: worker.name }, "BullMQ worker error");
    });
  }

  return workers;
}

export async function closeWorkers(workers: Worker[]) {
  await Promise.all(
    workers.map(async (worker) => {
      await worker.close();
      logger.info({ queueName: worker.name }, "BullMQ worker closed");
    }),
  );
}
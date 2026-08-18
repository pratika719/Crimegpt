import { Worker, type WorkerOptions } from "bullmq";
import { getRedisConnection } from "@/lib/redis";
import { QUEUE_NAMES } from "@/lib/queue/queue-names";
import type { DocumentGenerationJobPayload } from "@/lib/queue/job-types";
import { jobStatusService } from "@/services/queue/job-status.service";
import { jobStatusRepository } from "@/features/case/repositories/job-status.repository";
import { processAIGenerationJob } from "@/workers/ai-generation.processor";
import { processCleanupJob } from "@/workers/cleanup.processor";
import { processDocumentGenerationJob } from "@/workers/document-generator.processor";
import { processEmailJob } from "@/workers/email.processor";
import { processEmbeddingJob } from "@/workers/embedding.processor";
import { processIngestionJob } from "@/workers/ingestion.processor";
import { logger } from "@/lib/logger";
import { WORKER_CONCURRENCY } from "@/lib/worker/worker-concurrency";

const connection = getRedisConnection() as any;

// BullMQ v5 WorkerOptions: use longer intervals to reduce Redis idle commands.
// stalledInterval=240s (4min) ensures stalled checks are infrequent and stays safely
// above lockDuration (120s) to avoid false stall detection.
const defaultWorkerOptions: WorkerOptions = {
  connection,
  autorun: true,
  skipVersionCheck: true,
  stalledInterval: 240_000,
};

// Document generation involves long-running Gemini API calls (up to ~60s each, plus a
// possible bounded repair re-prompt) and DB transactions. Use a longer lock duration to
// prevent BullMQ from marking jobs as stalled prematurely.
const documentGenerationWorkerOptions: WorkerOptions = {
  ...defaultWorkerOptions,
  concurrency: WORKER_CONCURRENCY.DOCUMENT_GENERATION,
  lockDuration: 240_000,
};

export function createWorkers() {
  const workers = [
    new Worker(
      QUEUE_NAMES.DOCUMENT_GENERATION,
      processDocumentGenerationJob,
      documentGenerationWorkerOptions,
    ),

    new Worker(
      QUEUE_NAMES.AI_GENERATION,
      processAIGenerationJob,
      {
        ...defaultWorkerOptions,
        concurrency: WORKER_CONCURRENCY.DOCUMENT_GENERATION,
      },
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

      // Belt-and-braces: if the processor's catch block did not persist a failed
      // JobStatus row (crash, timeout, unexpected discard path), write one here so
      // the frontend polling always sees a terminal failure.
      if (worker.name === QUEUE_NAMES.DOCUMENT_GENERATION && job) {
        const data = job.data as DocumentGenerationJobPayload | undefined;
        const jobId = String(job.id);

        jobStatusRepository
          .findById(jobId)
          .then((existing) => {
            if (existing && existing.status === "failed") return;
            return jobStatusService.setJobStatus({
              jobId,
              queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
              status: "failed",
              userId: data?.userId,
              caseId: data?.caseId,
              documentType: data?.documentType,
              errorMessage: job.failedReason ?? error.message,
            });
          })
          .catch((err) => {
            logger.warn(
              { err, jobId, queueName: worker.name },
              "Failed to write fallback failed job status to DB",
            );
          });
      }
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
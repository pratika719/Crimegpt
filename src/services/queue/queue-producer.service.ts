import crypto from "node:crypto";
import { DocumentType } from "@/generated/prisma/client";
import {
  aiGenerationQueue,
  cleanupQueue,
  documentGenerationQueue,
  emailQueue,
  embeddingQueue,
  ingestionQueue,
} from "@/lib/queue/queues";
import { QUEUE_NAMES } from "@/lib/queue/queue-names";
import { createSafeJobId } from "@/lib/queue/job-id";
import { QUEUE_RETRY_POLICY } from "@/lib/queue/retry-policy";
import type {
  AIGenerationJobPayload,
  CleanupJobPayload,
  DocumentGenerationJobPayload,
  EmailJobPayload,
  EmbeddingJobPayload,
  IngestionJobPayload,
} from "@/lib/queue/job-types";
import { jobStatusService } from "@/services/queue/job-status.service";
import { jobStatusRepository } from "@/repositories/job-status.repository";
import { logger } from "@/lib/logger";

function createRequestId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class QueueProducerService {
  async addDocumentGenerationJob(input: {
    caseId: string;
    userId: string;
    documentType: DocumentType;
    forceRegenerate?: boolean;
    inputHash?: string;
  }) {
    const requestId = createRequestId("docgen");

    const baseJobId = input.inputHash
      ? createSafeJobId([input.inputHash])
      : createSafeJobId([QUEUE_NAMES.DOCUMENT_GENERATION, input.caseId, input.documentType]);

    const jobId = input.forceRegenerate
      ? createSafeJobId([baseJobId, Date.now()])
      : baseJobId;

    if (!input.forceRegenerate) {
      const existingStatus = await jobStatusRepository.findById(baseJobId);

      if (existingStatus) {
        const state = existingStatus.status;

        if (state === "pending" || state === "active") {
          // Verify if the job actually exists and is active/waiting/delayed/paused in BullMQ
          const job = await documentGenerationQueue.getJob(baseJobId);
          const jobState = job ? await job.getState() : null;

          if (job && (jobState === "active" || jobState === "waiting" || jobState === "delayed" || jobState === "prioritized")) {
            logger.info(
              {
                jobId: baseJobId,
                queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
                caseId: input.caseId,
                userId: input.userId,
                documentType: input.documentType,
                state,
                jobState,
                reused: true,
              },
              "Reusing active document generation job",
            );

            return {
              jobId: baseJobId,
              requestId: "",
              queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
              reused: true,
              state,
            };
          } else {
            logger.warn(
              {
                jobId: baseJobId,
                dbStatus: state,
                jobState,
              },
              "Stale job status found in database but job is missing or inactive in BullMQ. Re-enqueueing.",
            );
          }
        }
      }
    }

    const payload: DocumentGenerationJobPayload = {
      caseId: input.caseId,
      userId: input.userId,
      documentType: input.documentType,
      forceRegenerate: input.forceRegenerate ?? false,
      inputHash: input.inputHash,
      requestId,
      createdAt: new Date().toISOString(),
    };

    const job = await documentGenerationQueue.add(
      "generate-document",
      payload,
      {
        jobId,
        ...QUEUE_RETRY_POLICY.DOCUMENT_GENERATION,
      },
    );

    // Write initial pending status to DB (replaces Redis-based polling)
    await jobStatusService.setJobStatus({
      jobId: String(job.id),
      queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
      status: "pending",
      userId: input.userId,
      caseId: input.caseId,
      documentType: input.documentType,
    });

    logger.info(
      {
        jobId: String(job.id),
        queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
        caseId: input.caseId,
        userId: input.userId,
        documentType: input.documentType,
        reused: false,
      },
      "Document generation job enqueued",
    );

    return {
      jobId: String(job.id),
      requestId,
      queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
      reused: false,
      state: "pending",
    };
  }

  async addAIGenerationJob(
    input: Omit<AIGenerationJobPayload, "requestId" | "createdAt">,
  ) {
    const payload: AIGenerationJobPayload = {
      ...input,
      requestId: createRequestId("aigen"),
      createdAt: new Date().toISOString(),
    };

    const jobId = input.inputHash
      ? createSafeJobId([input.inputHash])
      : createSafeJobId([QUEUE_NAMES.AI_GENERATION, input.caseId, input.requestType]);

    const job = await aiGenerationQueue.add("generate-ai", payload, {
      jobId,
      ...QUEUE_RETRY_POLICY.AI_GENERATION,
    });

    logger.info(
      {
        jobId: String(job.id),
        queueName: QUEUE_NAMES.AI_GENERATION,
        caseId: input.caseId,
        requestType: input.requestType,
      },
      "AI generation job enqueued",
    );

    return {
      jobId: String(job.id),
      requestId: payload.requestId,
      queueName: QUEUE_NAMES.AI_GENERATION,
    };
  }

  async addIngestionJob(
    input: Omit<IngestionJobPayload, "requestId" | "createdAt">,
  ) {
    const payload: IngestionJobPayload = {
      ...input,
      requestId: createRequestId("ingest"),
      createdAt: new Date().toISOString(),
    };

    const job = await ingestionQueue.add("ingest-source", payload, {
      jobId: createSafeJobId([payload.sourceType, payload.sourceId]),
      ...QUEUE_RETRY_POLICY.INGESTION,
    });

    logger.info(
      {
        jobId: String(job.id),
        queueName: QUEUE_NAMES.INGESTION,
        caseId: input.caseId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
      "Ingestion job enqueued",
    );

    return {
      jobId: String(job.id),
      requestId: payload.requestId,
      queueName: QUEUE_NAMES.INGESTION,
    };
  }

  async addEmailJob(input: Omit<EmailJobPayload, "requestId" | "createdAt">) {
    const payload: EmailJobPayload = {
      ...input,
      requestId: createRequestId("email"),
      createdAt: new Date().toISOString(),
    };

    const jobId = createSafeJobId(["email", payload.to, payload.subject, payload.requestId]);

    const job = await emailQueue.add("send-email", payload, {
      jobId,
      ...QUEUE_RETRY_POLICY.EMAIL,
    });

    logger.info(
      {
        jobId: String(job.id),
        queueName: QUEUE_NAMES.EMAIL,
        to: input.to,
        subject: input.subject,
      },
      "Email job enqueued",
    );

    return {
      jobId: String(job.id),
      requestId: payload.requestId,
      queueName: QUEUE_NAMES.EMAIL,
    };
  }

  async addCleanupJob(
    input: Omit<CleanupJobPayload, "requestId" | "createdAt">,
  ) {
    const payload: CleanupJobPayload = {
      ...input,
      requestId: createRequestId("cleanup"),
      createdAt: new Date().toISOString(),
    };

    const job = await cleanupQueue.add("run-cleanup", payload, {
      jobId: createSafeJobId([payload.cleanupType, payload.olderThanDays ?? "default"]),
      ...QUEUE_RETRY_POLICY.CLEANUP,
    });

    logger.info(
      {
        jobId: String(job.id),
        queueName: QUEUE_NAMES.CLEANUP,
        cleanupType: input.cleanupType,
      },
      "Cleanup job enqueued",
    );

    return {
      jobId: String(job.id),
      requestId: payload.requestId,
      queueName: QUEUE_NAMES.CLEANUP,
    };
  }

  async addEmbeddingJob(
    input: Omit<EmbeddingJobPayload, "requestId" | "createdAt">,
  ) {
    const payload: EmbeddingJobPayload = {
      ...input,
      requestId: createRequestId("embed"),
      createdAt: new Date().toISOString(),
    };

    const job = await embeddingQueue.add("generate-embedding", payload, {
      jobId: createSafeJobId([payload.sourceType, payload.sourceId, payload.chunkIndex ?? 0]),
      ...QUEUE_RETRY_POLICY.EMBEDDING,
    });

    logger.info(
      {
        jobId: String(job.id),
        queueName: QUEUE_NAMES.EMBEDDING,
        caseId: input.caseId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        chunkIndex: input.chunkIndex,
      },
      "Embedding job enqueued",
    );

    return {
      jobId: String(job.id),
      requestId: payload.requestId,
      queueName: QUEUE_NAMES.EMBEDDING,
    };
  }
}

export const queueProducerService = new QueueProducerService();
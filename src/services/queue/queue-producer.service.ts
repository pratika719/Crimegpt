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
      const existingJob = await documentGenerationQueue.getJob(baseJobId);

      if (existingJob) {
        const state = await existingJob.getState();

        if (
          state === "waiting" ||
          state === "active" ||
          state === "delayed" ||
          state === "prioritized" ||
          state === "waiting-children"
        ) {
          logger.info(
            {
              jobId: String(existingJob.id),
              queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
              caseId: input.caseId,
              userId: input.userId,
              documentType: input.documentType,
              state,
              reused: true,
            },
            "Reusing active document generation job",
          );

          return {
            jobId: String(existingJob.id),
            requestId: existingJob.data.requestId,
            queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
            reused: true,
            state,
          };
        }

        if (state === "completed" || state === "failed") {
          await existingJob.remove();
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
      state: "waiting",
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
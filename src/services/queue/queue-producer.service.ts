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
import type {
  AIGenerationJobPayload,
  CleanupJobPayload,
  DocumentGenerationJobPayload,
  EmailJobPayload,
  EmbeddingJobPayload,
  IngestionJobPayload,
} from "@/lib/queue/job-types";

function createRequestId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createSafeJobId(parts: Array<string | number | boolean | undefined | null>): string {
  return parts
    .filter((part) => part !== undefined && part !== null)
    .map((part) =>
      String(part)
        .replace(/:/g, "__")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "_"),
    )
    .join("__");
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
      },
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
    });

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
    });

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

    const job = await emailQueue.add("send-email", payload);

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
    });

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
    });

    return {
      jobId: String(job.id),
      requestId: payload.requestId,
      queueName: QUEUE_NAMES.EMBEDDING,
    };
  }
}

export const queueProducerService = new QueueProducerService();
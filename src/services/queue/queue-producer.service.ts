import crypto from "node:crypto";
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

export class QueueProducerService {
  async addDocumentGenerationJob(
    input: Omit<DocumentGenerationJobPayload, "requestId" | "createdAt">,
  ) {
    const payload: DocumentGenerationJobPayload = {
      ...input,
      requestId: createRequestId("docgen"),
      createdAt: new Date().toISOString(),
    };

    const jobId =
      input.inputHash ??
      `${QUEUE_NAMES.DOCUMENT_GENERATION}:${input.caseId}:${input.documentType}`;

    return documentGenerationQueue.add("generate-document", payload, {
      jobId,
    });
  }

  async addAIGenerationJob(
    input: Omit<AIGenerationJobPayload, "requestId" | "createdAt">,
  ) {
    const payload: AIGenerationJobPayload = {
      ...input,
      requestId: createRequestId("aigen"),
      createdAt: new Date().toISOString(),
    };

    const jobId =
      input.inputHash ??
      `${QUEUE_NAMES.AI_GENERATION}:${input.caseId}:${input.requestType}`;

    return aiGenerationQueue.add("generate-ai", payload, {
      jobId,
    });
  }

  async addEmbeddingJob(
    input: Omit<EmbeddingJobPayload, "requestId" | "createdAt">,
  ) {
    const payload: EmbeddingJobPayload = {
      ...input,
      requestId: createRequestId("embed"),
      createdAt: new Date().toISOString(),
    };

    return embeddingQueue.add("generate-embedding", payload, {
      jobId: `${payload.sourceType}:${payload.sourceId}:${payload.chunkIndex ?? 0}`,
    });
  }

  async addIngestionJob(
    input: Omit<IngestionJobPayload, "requestId" | "createdAt">,
  ) {
    const payload: IngestionJobPayload = {
      ...input,
      requestId: createRequestId("ingest"),
      createdAt: new Date().toISOString(),
    };

    return ingestionQueue.add("ingest-source", payload, {
      jobId: `${payload.sourceType}:${payload.sourceId}`,
    });
  }

  async addEmailJob(input: Omit<EmailJobPayload, "requestId" | "createdAt">) {
    const payload: EmailJobPayload = {
      ...input,
      requestId: createRequestId("email"),
      createdAt: new Date().toISOString(),
    };

    return emailQueue.add("send-email", payload);
  }

  async addCleanupJob(
    input: Omit<CleanupJobPayload, "requestId" | "createdAt">,
  ) {
    const payload: CleanupJobPayload = {
      ...input,
      requestId: createRequestId("cleanup"),
      createdAt: new Date().toISOString(),
    };

    return cleanupQueue.add("run-cleanup", payload, {
      jobId: `${payload.cleanupType}:${payload.olderThanDays ?? "default"}`,
    });
  }
}

export const queueProducerService = new QueueProducerService();
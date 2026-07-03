import { Queue, QueueEvents } from "bullmq";
import { getBullMQConnection } from "@/lib/queue/bullmq-connection";
import { QUEUE_NAMES } from "@/lib/queue/queue-names";
import type {
  AIGenerationJobPayload,
  CleanupJobPayload,
  DocumentGenerationJobPayload,
  EmailJobPayload,
  EmbeddingJobPayload,
  IngestionJobPayload,
} from "@/lib/queue/job-types";

const connection = getBullMQConnection() as any;

export const aiGenerationQueue = new Queue<AIGenerationJobPayload, any, string>(
  QUEUE_NAMES.AI_GENERATION,
  {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: {
        age: 86_400,
        count: 1_000,
      },
      removeOnFail: {
        age: 604_800,
        count: 5_000,
      },
    },
  },
);

export const documentGenerationQueue =
  new Queue<DocumentGenerationJobPayload, any, string>(QUEUE_NAMES.DOCUMENT_GENERATION, {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10_000,
      },
      removeOnComplete: {
        age: 86_400,
        count: 1_000,
      },
      removeOnFail: {
        age: 604_800,
        count: 5_000,
      },
    },
  });

export const embeddingQueue = new Queue<EmbeddingJobPayload, any, string>(
  QUEUE_NAMES.EMBEDDING,
  {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 3_000,
      },
      removeOnComplete: {
        age: 86_400,
        count: 2_000,
      },
      removeOnFail: {
        age: 604_800,
        count: 5_000,
      },
    },
  },
);

export const ingestionQueue = new Queue<IngestionJobPayload, any, string>(
  QUEUE_NAMES.INGESTION,
  {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: {
        age: 86_400,
        count: 1_000,
      },
      removeOnFail: {
        age: 604_800,
        count: 5_000,
      },
    },
  },
);

export const emailQueue = new Queue<EmailJobPayload, any, string>(QUEUE_NAMES.EMAIL, {
  connection,
  skipVersionCheck: true,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2_000,
    },
    removeOnComplete: {
      age: 86_400,
      count: 1_000,
    },
    removeOnFail: {
      age: 604_800,
      count: 5_000,
    },
  },
});

export const cleanupQueue = new Queue<CleanupJobPayload, any, string>(QUEUE_NAMES.CLEANUP, {
  connection,
  skipVersionCheck: true,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10_000,
    },
    removeOnComplete: {
      age: 86_400,
      count: 500,
    },
    removeOnFail: {
      age: 604_800,
      count: 1_000,
    },
  },
});

export const queueEvents = {
  aiGeneration: new QueueEvents(QUEUE_NAMES.AI_GENERATION, { connection, skipVersionCheck: true }),
  documentGeneration: new QueueEvents(QUEUE_NAMES.DOCUMENT_GENERATION, {
    connection,
    skipVersionCheck: true,
  }),
  embedding: new QueueEvents(QUEUE_NAMES.EMBEDDING, { connection, skipVersionCheck: true }),
  ingestion: new QueueEvents(QUEUE_NAMES.INGESTION, { connection, skipVersionCheck: true }),
  email: new QueueEvents(QUEUE_NAMES.EMAIL, { connection, skipVersionCheck: true }),
  cleanup: new QueueEvents(QUEUE_NAMES.CLEANUP, { connection, skipVersionCheck: true }),
};
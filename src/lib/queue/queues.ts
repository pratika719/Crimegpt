import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/redis";
import { QUEUE_NAMES } from "@/lib/queue/queue-names";
import { QUEUE_RETRY_POLICY } from "@/lib/queue/retry-policy";
import type {
  AIGenerationJobPayload,
  CleanupJobPayload,
  DocumentGenerationJobPayload,
  EmailJobPayload,
  EmbeddingJobPayload,
  IngestionJobPayload,
} from "@/lib/queue/job-types";

const connection = getRedisConnection() as any;

export const aiGenerationQueue = new Queue<AIGenerationJobPayload, any, string>(
  QUEUE_NAMES.AI_GENERATION,
  {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: QUEUE_RETRY_POLICY.AI_GENERATION,
  },
);

export const documentGenerationQueue =
  new Queue<DocumentGenerationJobPayload, any, string>(QUEUE_NAMES.DOCUMENT_GENERATION, {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: QUEUE_RETRY_POLICY.DOCUMENT_GENERATION,
  });

export const embeddingQueue = new Queue<EmbeddingJobPayload, any, string>(
  QUEUE_NAMES.EMBEDDING,
  {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: QUEUE_RETRY_POLICY.EMBEDDING,
  },
);

export const ingestionQueue = new Queue<IngestionJobPayload, any, string>(
  QUEUE_NAMES.INGESTION,
  {
    connection,
    skipVersionCheck: true,
    defaultJobOptions: QUEUE_RETRY_POLICY.INGESTION,
  },
);

export const emailQueue = new Queue<EmailJobPayload, any, string>(QUEUE_NAMES.EMAIL, {
  connection,
  skipVersionCheck: true,
  defaultJobOptions: QUEUE_RETRY_POLICY.EMAIL,
});

export const cleanupQueue = new Queue<CleanupJobPayload, any, string>(QUEUE_NAMES.CLEANUP, {
  connection,
  skipVersionCheck: true,
  defaultJobOptions: QUEUE_RETRY_POLICY.CLEANUP,
});


export const QUEUE_NAMES = {
  AI_GENERATION: "ai-generation",
  DOCUMENT_GENERATION: "document-generation",
  EMBEDDING: "embedding",
  INGESTION: "ingestion",
  EMAIL: "email",
  CLEANUP: "cleanup",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
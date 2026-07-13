// Redis Cloud free tier (500k commands/month) — purge aggressively.
// Completed jobs are deleted immediately. Failed jobs kept for 5 minutes max.
// Job status is tracked in PostgreSQL via JobStatus table, not Redis/BullMQ.
export const QUEUE_RETRY_POLICY = {
  DOCUMENT_GENERATION: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5_000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 300,
      count: 5,
    },
  },

  EMBEDDING: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 3_000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 300,
      count: 5,
    },
  },

  INGESTION: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 3_000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 300,
      count: 5,
    },
  },

  AI_GENERATION: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5_000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 300,
      count: 5,
    },
  },

  EMAIL: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5_000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 300,
      count: 5,
    },
  },

  CLEANUP: {
    attempts: 2,
    backoff: {
      type: "exponential" as const,
      delay: 10_000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 300,
      count: 5,
    },
  },
} as const;
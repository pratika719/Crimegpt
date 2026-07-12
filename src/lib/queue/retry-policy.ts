export const QUEUE_RETRY_POLICY = {
  DOCUMENT_GENERATION: {
    attempts: 1,
    backoff: {
      type: "exponential" as const,
      delay: 5_000,
    },
    removeOnComplete: {
      age: 60 * 60,
      count: 500,
    },
    removeOnFail: {
      age: 24 * 60 * 60,
      count: 1_000,
    },
  },

  EMBEDDING: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 3_000,
    },
    removeOnComplete: {
      age: 60 * 60,
      count: 1_000,
    },
    removeOnFail: {
      age: 24 * 60 * 60,
      count: 2_000,
    },
  },

  INGESTION: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 3_000,
    },
    removeOnComplete: {
      age: 60 * 60,
      count: 1_000,
    },
    removeOnFail: {
      age: 24 * 60 * 60,
      count: 2_000,
    },
  },

  AI_GENERATION: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5_000,
    },
    removeOnComplete: {
      age: 60 * 60,
      count: 500,
    },
    removeOnFail: {
      age: 24 * 60 * 60,
      count: 1_000,
    },
  },

  EMAIL: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5_000,
    },
    removeOnComplete: {
      age: 60 * 60,
      count: 500,
    },
    removeOnFail: {
      age: 24 * 60 * 60,
      count: 1_000,
    },
  },

  CLEANUP: {
    attempts: 2,
    backoff: {
      type: "exponential" as const,
      delay: 10_000,
    },
    removeOnComplete: {
      age: 60 * 60,
      count: 500,
    },
    removeOnFail: {
      age: 24 * 60 * 60,
      count: 1_000,
    },
  },
} as const;
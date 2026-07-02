export const redisKeys = {
  lock: {
    documentGeneration: (caseId: string, documentType: string) =>
      `lock:document-generation:${caseId}:${documentType}`,
  },

  dedupe: {
    aiRequest: (inputHash: string) => `dedupe:ai-request:${inputHash}`,
    documentGeneration: (caseId: string, documentType: string) =>
      `dedupe:document-generation:${caseId}:${documentType}`,
  },

  temp: {
    aiState: (requestId: string) => `temp:ai-state:${requestId}`,
  },

  cache: {
    lawRetrieval: (queryHash: string) => `cache:law-retrieval:${queryHash}`,
    queryEmbedding: (queryHash: string) => `cache:query-embedding:${queryHash}`,
    caseDashboard: (userId: string) => `cache:case-dashboard:${userId}`,
  },
} as const;
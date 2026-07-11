export const cacheKeys = {
  queryEmbedding: (hash: string) => `cache:query-embedding:${hash}`,

  lawRetrieval: (hash: string) => `cache:law-retrieval:${hash}`,

  caseDashboard: (userId: string) => `cache:case-dashboard:${userId}`,

  caseDetail: (userId: string, caseId: string) =>
    `cache:case-detail:${userId}:${caseId}`,

  caseSearch: (userId: string, hash: string) =>
    `cache:case-search:${userId}:${hash}`,

  aiSummary: (caseId: string) => `cache:ai-summary:${caseId}`,
} as const;
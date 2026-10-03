import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheKeysService {
  queryEmbedding(hash: string): string {
    return `cache:query-embedding:${hash}`;
  }

  lawRetrieval(hash: string): string {
    return `cache:law-retrieval:${hash}`;
  }

  caseDashboard(userId: string): string {
    return `cache:case-dashboard:${userId}`;
  }

  caseDetail(userId: string, caseId: string): string {
    return `cache:case-detail:${userId}:${caseId}`;
  }

  caseSearch(userId: string, hash: string): string {
    return `cache:case-search:${userId}:${hash}`;
  }

  aiSummary(caseId: string): string {
    return `cache:ai-summary:${caseId}`;
  }
}

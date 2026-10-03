import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import type { CleanedLawReference } from '../types/ai.types';
import { CacheService, CacheKeysService } from '@/common/cache';
import { VectorStoreService, Document } from '../vector/pgvector.service';
import { LAW_RETRIEVAL_CACHE_TTL, STRING_NA } from '../constants/ai.constants';

// ---------------------------------------------------------------------------
// Cache key builder
// ---------------------------------------------------------------------------

function createCacheHash(input: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
}

// ---------------------------------------------------------------------------
// LawRetrieverService
// ---------------------------------------------------------------------------

@Injectable()
export class LawRetrieverService {
  private readonly logger = new Logger(LawRetrieverService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheKeys: CacheKeysService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  /**
   * Retrieve relevant law sections with resilient 3-tier fallback.
   * Tier 1: Vector search (FastAPI + pgvector)
   * Tier 2: Stale cached vector (if FastAPI is down and query was seen before)
   * Tier 3: PostgreSQL Full-Text & Lexical search (if vector search fails or yields 0)
   */
  async retrieve(
    narrative: string,
    k = 4,
    opts?: { bypassCache?: boolean; minSimilarity?: number },
  ): Promise<CleanedLawReference[]> {
    if (!narrative || narrative.trim().length === 0) return [];

    const hash = createCacheHash({
      query: narrative.trim().toLowerCase(),
      topK: k,
      corpus: 'ipc-bns',
      version: 'v1',
    });
    const cacheKey = this.cacheKeys.lawRetrieval(hash);

    // 1. Check Level-1 cache unless bypassCache is requested
    if (!opts?.bypassCache) {
      const cached = await this.cacheService.get<CleanedLawReference[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }

    let results: [Document, number][] = [];
    let isLexicalFallback = false;

    // 2. Tier 1 & Tier 2: Try vector similarity search
    try {
      results = await this.vectorStore.similaritySearchDeduplicated(narrative, k, {
        bypassCache: opts?.bypassCache,
        minSimilarity: opts?.minSimilarity,
      });
    } catch (err) {
      this.logger.warn(
        { err: (err as Error).message },
        'Vector similarity search failed — engaging Tier 3 PostgreSQL lexical fallback',
      );
    }

    // 3. Tier 3: If vector search failed or returned 0 results, fall back to PostgreSQL lexical/FTS
    if (results.length === 0) {
      try {
        this.logger.log(
          { narrativeSnippet: narrative.substring(0, 100) },
          'Zero vector matches — executing PostgreSQL lexical search fallback',
        );
        results = await this.vectorStore.lexicalSearch(narrative, k);
        isLexicalFallback = true;
      } catch (lexicalErr) {
        this.logger.error({ lexicalErr }, 'Both vector and lexical law retrieval failed');
      }
    }

    const references = this.mapDocsToReferences(results);

    // 4. Cache only high-fidelity vector matches (never cache degraded lexical fallbacks or empty results)
    if (references.length > 0 && !isLexicalFallback) {
      await this.cacheService.set(cacheKey, references, LAW_RETRIEVAL_CACHE_TTL);
    }

    return references;
  }

  private mapDocsToReferences(results: [Document, number][]): CleanedLawReference[] {
    return results.map(([doc]) => {
      const pageContent = doc.pageContent;
      const descMatch = pageContent.match(/Description:\r?\n([\s\S]*)$/i);
      const description = descMatch?.[1]?.trim() ?? pageContent;

      const rawOffense = String(doc.metadata?.offense || '').trim();
      const offense =
        !rawOffense || rawOffense.toLowerCase() === 'nan'
          ? String(doc.metadata?.section || STRING_NA)
          : rawOffense;

      const rawPunishment = String(doc.metadata?.punishment || '').trim();
      const punishment =
        !rawPunishment || rawPunishment.toLowerCase() === 'nan'
          ? 'As prescribed under statutory provisions.'
          : rawPunishment;

      return {
        section: String(doc.metadata?.section || STRING_NA),
        title: offense,
        content: pageContent,
        source: String(doc.metadata?.source || 'IPC'),
        offense,
        punishment,
        description,
      };
    });
  }
}

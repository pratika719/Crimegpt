import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import type { CleanedLawReference } from '../types/ai.types';
import { CacheService } from '../../cache/cache.service';
import { CacheKeysService } from '../../cache/cache-keys.service';
import { VectorStoreService } from '../vector/pgvector.service';
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
   * Retrieve relevant law sections with Redis caching.
   *
   * @param narrative  The case narrative to search against.
   * @param k          Number of unique chunks to return (default 4).
   * @param opts       Options including optional bypassCache flag.
   */
  async retrieve(
    narrative: string,
    k = 4,
    opts?: { bypassCache?: boolean },
  ): Promise<CleanedLawReference[]> {
    if (!narrative || narrative.trim().length === 0) return [];

    const hash = createCacheHash({
      query: narrative.trim().toLowerCase(),
      topK: k,
      corpus: 'ipc-bns',
      version: 'v1',
    });
    const cacheKey = this.cacheKeys.lawRetrieval(hash);

    // Check cache first (unless bypassed)
    if (!opts?.bypassCache) {
      const cached = await this.cacheService.get<CleanedLawReference[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const results = await this.vectorStore.similaritySearchDeduplicated(narrative, k);

      const references: CleanedLawReference[] = results.map(([doc]) => {
        const pageContent = doc.pageContent;

        // Extract Description block if formatted standardly
        const descMatch = pageContent.match(/Description:\r?\n([\s\S]*)$/i);
        const description = descMatch?.[1]?.trim() ?? pageContent;

        const rawOffense = String(doc.metadata.offense || '').trim();
        const offense =
          !rawOffense || rawOffense.toLowerCase() === 'nan'
            ? String(doc.metadata.section || STRING_NA)
            : rawOffense;

        const rawPunishment = String(doc.metadata.punishment || '').trim();
        const punishment =
          !rawPunishment || rawPunishment.toLowerCase() === 'nan'
            ? 'As prescribed under statutory provisions.'
            : rawPunishment;

        return {
          section: String(doc.metadata.section || STRING_NA),
          title: offense,
          content: pageContent,
          source: String(doc.metadata.source || 'IPC'),
          offense,
          punishment,
          description,
        };
      });

      // Only cache non-empty results
      if (references.length > 0) {
        await this.cacheService.set(cacheKey, references, LAW_RETRIEVAL_CACHE_TTL);
      }

      return references;
    } catch (error) {
      this.logger.error(
        { narrativeSnippet: narrative.substring(0, 200), topK: k },
        'LawRetriever FAILED — RAG will proceed without legal context',
      );
      return [];
    }
  }
}

import { similaritySearchDeduplicated } from "../vector/pgvector";
import { cacheService } from "@/lib/cache/cache";
import { cacheKeys } from "@/lib/cache/cache-keys";
import { createCacheHash } from "@/lib/cache/cache-hash";
import { logger } from "@/lib/logger";

export interface CleanedLawReference {
  section: string;
  title: string;
  content: string;
  source: string;
  offense: string;
  punishment: string;
  description: string;
}

export async function retrieveLawsCached<T>(input: {
  query: string;
  topK: number;
  retrieve: () => Promise<T>;
  bypassCache?: boolean;
}): Promise<T> {
  const hash = createCacheHash({
    query: input.query.trim().toLowerCase(),
    topK: input.topK,
    corpus: "ipc-bns",
    version: "v1",
  });

  const cacheKey = cacheKeys.lawRetrieval(hash);

  if (!input.bypassCache) {
    const cached = await cacheService.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result = await input.retrieve();

  // Only cache non-empty array results to prevent caching temporary failures
  if (Array.isArray(result) && result.length > 0) {
    await cacheService.set(cacheKey, result, 21_600); // 6 hours TTL
  }

  return result;
}

/**
 * Custom Law Retriever to query relevant sections from the PGVector database
 * and return deduplicated legal references with Redis caching.
 */
export class LawRetriever {
  private defaultK: number;

  constructor(defaultK = 4) {
    this.defaultK = defaultK;
  }

  /**
   * Retrieves unique relevant laws from the PGVector store and cleans them.
   * 
   * @param narrative The case statement narrative.
   * @param k The number of unique documents to return.
   * @param options Options including optional bypassCache boolean.
   * @returns Cleaned legal reference objects.
   */
  async retrieve(
    narrative: string, 
    k = this.defaultK,
    options?: { bypassCache?: boolean }
  ): Promise<CleanedLawReference[]> {
    if (!narrative || narrative.trim().length === 0) {
      return [];
    }

    try {
      return await retrieveLawsCached({
        query: narrative,
        topK: k,
        bypassCache: options?.bypassCache,
        retrieve: async () => {
          // Call the deduplicated search from pgvector store
          const results = await similaritySearchDeduplicated(narrative, k);

          return results.map(([doc]) => {
            const pageContent = doc.pageContent;
            
            // Extract Description block from pageContent if formatted standardly
            let description = "";
            const descMatch = pageContent.match(/Description:\r?\n([\s\S]*)$/i);
            if (descMatch && descMatch[1]) {
              description = descMatch[1].trim();
            } else {
              description = pageContent;
            }

            const rawOffense = String(doc.metadata.offense || "").trim();
            const cleanOffense = !rawOffense || rawOffense.toLowerCase() === "nan" ? (doc.metadata.section || "N/A") : rawOffense;

            const rawPunishment = String(doc.metadata.punishment || "").trim();
            const cleanPunishment = !rawPunishment || rawPunishment.toLowerCase() === "nan" ? "As prescribed under statutory provisions." : rawPunishment;

            return {
              section: doc.metadata.section || "N/A",
              title: cleanOffense,
              content: pageContent,
              source: doc.metadata.source || "IPC",
              offense: cleanOffense,
              punishment: cleanPunishment,
              description: description,
            };
          });
        }
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          narrativeSnippet: narrative.substring(0, 200),
          topK: k,
        },
        "[LawRetriever] FAILED to retrieve law references — RAG will proceed without legal context."
      );
      return [];
    }
  }
}

export const lawRetriever = new LawRetriever();
export default lawRetriever;

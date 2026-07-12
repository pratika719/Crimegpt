import { similaritySearchDeduplicated } from "../vector/pgvector";
import { cacheService } from "@/lib/cache/cache";
import { cacheKeys } from "@/lib/cache/cache-keys";
import { createCacheHash } from "@/lib/cache/cache-hash";
import { diagnosticFlags } from "@/lib/ai/diagnostic-flags";

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
}): Promise<T> {
  if (!diagnosticFlags.useCache()) {
    return input.retrieve();
  }
  const hash = createCacheHash({
    query: input.query.trim().toLowerCase(),
    topK: input.topK,
    corpus: "ipc-bns",
    version: "v1",
  });

  return cacheService.getOrSet(
    cacheKeys.lawRetrieval(hash),
    21_600, // 6 hours TTL
    input.retrieve,
  );
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
   * @returns Cleaned legal reference objects.
   */
  async retrieve(narrative: string, k = this.defaultK): Promise<CleanedLawReference[]> {
    if (!narrative || narrative.trim().length === 0) {
      return [];
    }

    return retrieveLawsCached({
      query: narrative,
      topK: k,
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

          return {
            section: doc.metadata.section || "N/A",
            title: doc.metadata.offense || doc.metadata.section || "N/A",
            content: pageContent,
            source: doc.metadata.source || "IPC",
            offense: doc.metadata.offense || "N/A",
            punishment: doc.metadata.punishment || "N/A",
            description: description,
          };
        });
      }
    });
  }
}

export const lawRetriever = new LawRetriever();
export default lawRetriever;

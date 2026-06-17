import { similaritySearchDeduplicated } from "../vector/pgvector";

export interface CleanedLawReference {
  section: string;
  title: string;
  content: string;
  source: string;
  offense: string;
  punishment: string;
  description: string;
}

/**
 * Custom Law Retriever to query relevant sections from the PGVector database
 * and return deduplicated legal references.
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
}

export const lawRetriever = new LawRetriever();
export default lawRetriever;

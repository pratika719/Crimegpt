import { Embeddings } from "@langchain/core/embeddings";

/**
 * Swappable EmbeddingProvider interface that extends LangChain's Embeddings base class.
 * All future embedding providers (e.g. OpenAI, Gemini, Nomic, Cohere) should implement
 * this interface to ensure clean swappability across ingestion and retrieval layers.
 * (Note: timeout and cancellation signals are handled by calling layers / concrete providers)
 */
export interface EmbeddingProvider extends Embeddings {
  /**
   * Embeds a query string into a vector.
   * @param text The input query.
   * @returns A promise resolving to the query's vector embedding.
   */
  embedQuery(text: string): Promise<number[]>;

  /**
   * Embeds a list of documents into vectors.
   * @param texts The input documents array.
   * @returns A promise resolving to an array of document vector embeddings.
   */
  embedDocuments(texts: string[]): Promise<number[][]>;
}

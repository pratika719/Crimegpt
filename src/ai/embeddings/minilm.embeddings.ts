import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";
import { EmbeddingProvider } from "./embedding-provider";

/**
 * Local implementation of all-MiniLM-L6-v2 embeddings using @huggingface/transformers.
 * 
 * Model Information & Architecture:
 * - Model: Xenova/all-MiniLM-L6-v2 (ONNX-optimized version of Hugging Face's all-MiniLM-L6-v2).
 * - Dimensions: 384 dimensions.
 * - Downloads: The model is downloaded automatically from the Hugging Face hub on first run (approx. 90MB).
 * - Cache Location: Default local cache directory (~/.cache/huggingface/hub or %USERPROFILE%/.cache/huggingface/hub).
 * - Performance: Runs 100% locally on CPU without external API keys, rate limits, or network request overhead.
 * - Concurrency: Sequential and CPU-efficient execution.
 */
export class MiniLMEmbeddings extends Embeddings implements EmbeddingProvider {
  // Promise holding the feature-extraction pipeline singleton instance
  private static pipelineInstancePromise: any = null;

  constructor(params?: EmbeddingsParams) {
    super(params ?? {});
  }

  /**
   * Lazily initializes and returns the ONNX pipeline singleton.
   */
  private static async getPipeline() {
    if (!this.pipelineInstancePromise) {
      // Lazy load to prevent issues during Next.js build/initialization
      const { env, pipeline } = await import("@huggingface/transformers");
      
      // Ensure we don't look for local ONNX files, directly pull from cache/hub
      env.allowLocalModels = false;

      // Configure cache directory to a writable path in serverless environments
      env.cacheDir = "/tmp/huggingface-cache";

      // Initialize feature-extraction pipeline for all-MiniLM-L6-v2
      this.pipelineInstancePromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return this.pipelineInstancePromise;
  }

  /**
   * Embeds a list of documents into vectors.
   * @param documents Array of strings representing legal/text chunks.
   * @returns 2D array of number representing embeddings.
   */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    const extractor = await MiniLMEmbeddings.getPipeline();
    const results: number[][] = [];

    for (const doc of documents) {
      // Replace newlines with spaces for optimal embedding output
      const cleanText = doc.replace(/\n/g, " ");
      const output = await extractor(cleanText, { pooling: "mean", normalize: true });
      results.push(Array.from(output.data) as number[]);
    }

    return results;
  }

  /**
   * Embeds a single search/user query.
   * @param query String representing user search query.
   * @returns Array of numbers representing the embedding vector.
   */
  async embedQuery(query: string): Promise<number[]> {
    const extractor = await MiniLMEmbeddings.getPipeline();
    const cleanText = query.replace(/\n/g, " ");
    const output = await extractor(cleanText, { pooling: "mean", normalize: true });
    return Array.from(output.data) as number[];
  }
}

// Export singleton instance of MiniLMEmbeddings for the application
export const embeddings = new MiniLMEmbeddings();
export default embeddings;

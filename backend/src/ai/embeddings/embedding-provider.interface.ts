/**
 * Contract for text embedding providers.
 *
 * The backend currently supports only the FastAPI sidecar, but the interface
 * keeps the door open for local models (e.g. @huggingface/transformers) later.
 */

export interface EmbeddingInput {
  texts: string[];
  bypassCache?: boolean;
}

export interface EmbeddingOutput {
  model: string;
  dimensions: number;
  embeddings: number[][];
}

export interface CrimeGPTEmbeddingProvider {
  embedTexts(input: EmbeddingInput): Promise<EmbeddingOutput>;
}

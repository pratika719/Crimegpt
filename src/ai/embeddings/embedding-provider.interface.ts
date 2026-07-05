export type EmbeddingInput = {
  texts: string[];
};

export type EmbeddingOutput = {
  model: string;
  dimensions: number;
  embeddings: number[][];
};

export interface CrimeGPTEmbeddingProvider {
  embedTexts(input: EmbeddingInput): Promise<EmbeddingOutput>;
}
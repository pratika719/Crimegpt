import type { CrimeGPTEmbeddingProvider } from "@/ai/embeddings/embedding-provider.interface";
import { FastAPIEmbeddingProvider } from "@/ai/embeddings/fastapi-embedding.provider";

let provider: CrimeGPTEmbeddingProvider | null = null;

export function getEmbeddingProvider(): CrimeGPTEmbeddingProvider {
  if (provider) {
    return provider;
  }

  const selectedProvider = process.env.EMBEDDING_PROVIDER ?? "fastapi";

  if (selectedProvider !== "fastapi") {
    throw new Error(
      `Unsupported EMBEDDING_PROVIDER: ${selectedProvider}. Only "fastapi" is supported.`,
    );
  }

  provider = new FastAPIEmbeddingProvider();

  return provider;
}

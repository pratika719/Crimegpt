import type {
  CrimeGPTEmbeddingProvider,
  EmbeddingInput,
  EmbeddingOutput,
} from "@/ai/embeddings/embedding-provider.interface";
import { cacheService } from "@/lib/cache/cache";
import { cacheKeys } from "@/lib/cache/cache-keys";
import { createCacheHash } from "@/lib/cache/cache-hash";
const EXPECTED_DIMENSIONS = 384;

function validateEmbeddingOutput(
  output: EmbeddingOutput,
  expectedCount: number,
): void {
  if (output.dimensions !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `Invalid embedding dimensions. Expected ${EXPECTED_DIMENSIONS}, received ${output.dimensions}.`,
    );
  }

  if (!Array.isArray(output.embeddings)) {
    throw new Error("Embedding response must contain embeddings array.");
  }

  if (output.embeddings.length !== expectedCount) {
    throw new Error(
      `Embedding count mismatch. Expected ${expectedCount}, received ${output.embeddings.length}.`,
    );
  }

  for (const vector of output.embeddings) {
    if (!Array.isArray(vector) || vector.length !== EXPECTED_DIMENSIONS) {
      throw new Error("Invalid embedding vector shape.");
    }

    for (const value of vector) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error("Embedding vector contains invalid numeric value.");
      }
    }
  }
}

export class FastAPIEmbeddingProvider implements CrimeGPTEmbeddingProvider {
  private readonly serviceUrl: string;
private getEmbeddingCacheKey(text: string): string {
  const hash = createCacheHash({
    provider: "fastapi",
    model: "sentence-transformers/all-MiniLM-L6-v2",
    text: text.trim().toLowerCase(),
  });

  return cacheKeys.queryEmbedding(hash);
}
  constructor(serviceUrl = process.env.EMBEDDING_SERVICE_URL) {
    if (!serviceUrl) {
      throw new Error("EMBEDDING_SERVICE_URL is not configured.");
    }

    this.serviceUrl = serviceUrl.replace(/\/$/, "");
  }
async embedTexts(input: EmbeddingInput): Promise<EmbeddingOutput> {
  const texts = input.texts.map((text) => text.trim()).filter(Boolean);

  if (texts.length === 0) {
    throw new Error("No valid text provided for embedding.");
  }

  if (texts.length === 1) {
    const cacheKey = this.getEmbeddingCacheKey(texts[0]);

    const cached = await cacheService.get<EmbeddingOutput>(cacheKey);

    if (cached) {
      return cached;
    }

    const output = await this.requestEmbeddings(texts);

    await cacheService.set(cacheKey, output, 86_400);

    return output;
  }

  return this.requestEmbeddings(texts);
}


private async requestEmbeddings(texts: string[]): Promise<EmbeddingOutput> {
  const response = await fetch(`${this.serviceUrl}/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `FastAPI embedding request failed: ${response.status} ${errorText}`,
    );
  }

  const output = (await response.json()) as EmbeddingOutput;

  validateEmbeddingOutput(output, texts.length);

  return output;
}
}
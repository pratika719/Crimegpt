import type {
  CrimeGPTEmbeddingProvider,
  EmbeddingInput,
  EmbeddingOutput,
} from "@/ai/embeddings/embedding-provider.interface";
import { cacheService } from "@/lib/cache/cache";
import { cacheKeys } from "@/lib/cache/cache-keys";
import { createCacheHash } from "@/lib/cache/cache-hash";
import { logger } from "@/lib/logger";
import {
  classifyAIError,
  truncateExternalErrorBody,
} from "@/lib/error/ai-error-classifier";
import { diagnosticFlags } from "@/lib/ai/diagnostic-flags";
const EXPECTED_DIMENSIONS = 384;
const DEFAULT_TIMEOUT_MS = 90_000;
const RETRY_DELAYS_MS = [0, 5_000, 10_000, 20_000] as const;

class EmbeddingProviderHttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = "EmbeddingProviderHttpError";
  }
}

function getRequestTimeoutMs(): number {
  const configured = Number(process.env.EMBEDDING_REQUEST_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  private readonly requestTimeoutMs: number;

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
    this.requestTimeoutMs = getRequestTimeoutMs();
  }

  async embedTexts(input: EmbeddingInput): Promise<EmbeddingOutput> {
    const texts = input.texts.map((text) => text.trim()).filter(Boolean);

    if (texts.length === 0) {
      throw new Error("No valid text provided for embedding.");
    }

    if (texts.length === 1) {
      const cacheKey = this.getEmbeddingCacheKey(texts[0]);

      const cached = diagnosticFlags.useCache()
        ? await cacheService.get<EmbeddingOutput>(cacheKey)
        : null;

      if (cached) {
        return cached;
      }

      const output = await this.requestEmbeddings(texts);

      if (diagnosticFlags.useCache()) {
        await cacheService.set(cacheKey, output, 86_400);
      }

      return output;
    }

    return this.requestEmbeddings(texts);
  }

  private async fetchWithTimeout(url: string, init: RequestInit = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      return await fetch(url, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new EmbeddingProviderHttpError("fetch timeout");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async ensureHealthy() {
    const response = await this.fetchWithTimeout(`${this.serviceUrl}/health`, {
      method: "GET",
    });

    if (!response.ok) {
      const body = truncateExternalErrorBody(await response.text());
      throw new EmbeddingProviderHttpError(
        `FastAPI health request failed: ${response.status}`,
        response.status,
        body,
      );
    }
  }

  private async postEmbeddings(texts: string[]): Promise<EmbeddingOutput> {
    const response = await this.fetchWithTimeout(`${this.serviceUrl}/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      const body = truncateExternalErrorBody(await response.text());
      throw new EmbeddingProviderHttpError(
        `FastAPI embedding request failed: ${response.status}`,
        response.status,
        body,
      );
    }

    const output = (await response.json()) as EmbeddingOutput;
    validateEmbeddingOutput(output, texts.length);

    return output;
  }

  private async requestEmbeddings(texts: string[]): Promise<EmbeddingOutput> {
    let lastError: unknown;

    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
      if (RETRY_DELAYS_MS[attempt] > 0) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }

      try {
        return await this.postEmbeddings(texts);
      } catch (error) {
        lastError = error;
        const classified = classifyAIError(error);

        logger.warn(
          {
            provider: "fastapi",
            statusCode: classified.statusCode,
            errorCategory: classified.category,
            retryable: classified.retryable,
            attempt: attempt + 1,
            maxAttempts: RETRY_DELAYS_MS.length,
            textsCount: texts.length,
            body:
              error instanceof EmbeddingProviderHttpError
                ? error.responseBody
                : undefined,
          },
          "FastAPI embedding request attempt failed",
        );

        if (!classified.retryable || attempt === RETRY_DELAYS_MS.length - 1) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("FastAPI embedding request failed.");
  }
}

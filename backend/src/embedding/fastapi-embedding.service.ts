import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import type {
  CrimeGPTEmbeddingProvider,
  EmbeddingInput,
  EmbeddingOutput,
} from '../ai/embeddings/embedding-provider.interface';
import { CacheService } from '../cache/cache.service';
import { CacheKeysService } from '../cache/cache-keys.service';

import {
  EMBEDDING_DIMENSIONS,
  QUERY_EMBEDDING_CACHE_TTL,
  FASTAPI_TIMEOUT_MS,
} from '../ai/constants/ai.constants';

const EXPECTED_DIMENSIONS = EMBEDDING_DIMENSIONS;

@Injectable()
export class FastapiEmbeddingService implements CrimeGPTEmbeddingProvider {
  private readonly logger = new Logger(FastapiEmbeddingService.name);
  private readonly serviceUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cacheService: CacheService,
    private readonly cacheKeys: CacheKeysService,
  ) {
    const url = this.config.get<string>('EMBEDDING_SERVICE_URL');
    if (!url) {
      this.logger.warn(
        'EMBEDDING_SERVICE_URL is not configured. Text embedding requests will fail until configured.',
      );
      this.serviceUrl = '';
    } else {
      this.serviceUrl = url.replace(/\/+$/, '').replace(/\/embed$/, '');
    }
  }

  // -----------------------------------------------------------------------
  // CrimeGPTEmbeddingProvider
  // -----------------------------------------------------------------------

  async embedTexts(input: EmbeddingInput): Promise<EmbeddingOutput> {
    const texts = input.texts.map((t) => t.trim()).filter(Boolean);
    if (texts.length === 0) {
      throw new Error('No valid text provided for embedding.');
    }

    const textKeys = texts.map((t) => this.buildCacheKey(t));
    const cachedOutputs: (EmbeddingOutput | null)[] = new Array(texts.length).fill(null);
    const uncachedIndices: number[] = [];

    // 1. Check Redis unless bypassCache is explicitly requested
    if (!input.bypassCache) {
      await Promise.all(
        textKeys.map(async (key, idx) => {
          const cached = await this.cacheService.get<EmbeddingOutput>(key);
          if (cached?.embeddings?.[0]?.length === EXPECTED_DIMENSIONS) {
            cachedOutputs[idx] = cached;
          } else {
            uncachedIndices.push(idx);
          }
        }),
      );
    } else {
      for (let i = 0; i < texts.length; i++) uncachedIndices.push(i);
    }

    // 2. All items were cached — return merged result without calling FastAPI
    if (uncachedIndices.length === 0) {
      return {
        model: cachedOutputs[0]?.model || 'sentence-transformers/all-MiniLM-L6-v2',
        dimensions: EXPECTED_DIMENSIONS,
        embeddings: cachedOutputs.map((o) => o!.embeddings[0]),
      };
    }

    // 3. Fetch missing texts from FastAPI (with resilient stale fallback on failure)
    const textsToFetch = uncachedIndices.map((i) => texts[i]);
    let fetchedOutput: EmbeddingOutput;

    try {
      fetchedOutput = await this.requestEmbeddings(textsToFetch);
    } catch (error) {
      // Emergency Tier-2 Stale Fallback: If FastAPI failed (even during bypassCache),
      // check if Redis has any stale vectors to prevent complete failure
      if (texts.length === 1) {
        const stale = await this.cacheService.get<EmbeddingOutput>(textKeys[0]);
        if (stale?.embeddings?.[0]?.length === EXPECTED_DIMENSIONS) {
          this.logger.warn({ text: texts[0] }, 'FastAPI unreachable — recovered using stale cached vector from Redis');
          return stale;
        }
      }
      throw error;
    }

    // 4. Cache newly computed vectors per text and merge results
    await Promise.all(
      fetchedOutput.embeddings.map(async (vector, fIdx) => {
        const origIdx = uncachedIndices[fIdx];
        const singleOutput: EmbeddingOutput = {
          model: fetchedOutput.model,
          dimensions: fetchedOutput.dimensions,
          embeddings: [vector],
        };
        cachedOutputs[origIdx] = singleOutput;
        await this.cacheService.set(textKeys[origIdx], singleOutput, QUERY_EMBEDDING_CACHE_TTL);
      }),
    );

    return {
      model: fetchedOutput.model,
      dimensions: fetchedOutput.dimensions,
      embeddings: cachedOutputs.map((o) => o!.embeddings[0]),
    };
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private buildCacheKey(text: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(text.trim().toLowerCase())
      .digest('hex');
    return this.cacheKeys.queryEmbedding(hash);
  }

  private async requestEmbeddings(texts: string[]): Promise<EmbeddingOutput> {
    if (!this.serviceUrl) {
      throw new Error(
        'EMBEDDING_SERVICE_URL is not configured. Text embedding cannot proceed.',
      );
    }

    const response = await fetch(`${this.serviceUrl}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(FASTAPI_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(
        `FastAPI embedding request failed: ${response.status} ${errorText}`,
      );
      this.logger.error(
        { textsCount: texts.length },
        'FastAPI embedding request failed',
      );
      throw err;
    }

    const output = (await response.json()) as EmbeddingOutput;
    this.validateOutput(output, texts.length);
    return output;
  }

  private validateOutput(output: EmbeddingOutput, expectedCount: number): void {
    if (output.dimensions !== EXPECTED_DIMENSIONS) {
      throw new Error(
        `Invalid embedding dimensions. Expected ${EXPECTED_DIMENSIONS}, received ${output.dimensions}.`,
      );
    }
    if (!Array.isArray(output.embeddings)) {
      throw new Error('Embedding response must contain embeddings array.');
    }
    if (output.embeddings.length !== expectedCount) {
      throw new Error(
        `Embedding count mismatch. Expected ${expectedCount}, received ${output.embeddings.length}.`,
      );
    }
    for (const vector of output.embeddings) {
      if (!Array.isArray(vector) || vector.length !== EXPECTED_DIMENSIONS) {
        throw new Error('Invalid embedding vector shape.');
      }
      for (const value of vector) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new Error('Embedding vector contains invalid numeric value.');
        }
      }
    }
  }
}

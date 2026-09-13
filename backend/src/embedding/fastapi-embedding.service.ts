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

const EXPECTED_DIMENSIONS = 384;

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
      throw new Error('EMBEDDING_SERVICE_URL is not configured.');
    }
    this.serviceUrl = url.replace(/\/+$/, '');
  }

  // -----------------------------------------------------------------------
  // CrimeGPTEmbeddingProvider
  // -----------------------------------------------------------------------

  async embedTexts(input: EmbeddingInput): Promise<EmbeddingOutput> {
    const texts = input.texts.map((t) => t.trim()).filter(Boolean);
    if (texts.length === 0) {
      throw new Error('No valid text provided for embedding.');
    }

    // Single-text requests can be cached
    if (texts.length === 1) {
      const cacheKey = this.buildCacheKey(texts[0]);
      const cached = await this.cacheService.get<EmbeddingOutput>(cacheKey);
      if (cached) return cached;

      const output = await this.requestEmbeddings(texts);
      await this.cacheService.set(cacheKey, output, 86_400); // 24h
      return output;
    }

    return this.requestEmbeddings(texts);
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
    const response = await fetch(`${this.serviceUrl}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(3000),
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

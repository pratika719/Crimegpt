import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pg from 'pg';
import { FastapiEmbeddingService } from '../../embedding/fastapi-embedding.service';
import {
  VECTOR_POOL_MAX_CONNECTIONS,
  VECTOR_POOL_IDLE_TIMEOUT_MS,
  VECTOR_POOL_CONNECTION_TIMEOUT_MS,
  HNSW_M,
  HNSW_EF_CONSTRUCTION,
  VECTOR_SIMILARITY_PRIMARY_THRESHOLD,
  VECTOR_SIMILARITY_FALLBACK_THRESHOLD,
} from '../constants/ai.constants';

// ---------------------------------------------------------------------------
// Document type (replaces LangChain's Document)
// ---------------------------------------------------------------------------

export interface Document {
  pageContent: string;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// VectorStoreService
// ---------------------------------------------------------------------------

@Injectable()
export class VectorStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VectorStoreService.name);
  private pool!: pg.Pool;

  constructor(
    private readonly config: ConfigService,
    private readonly embeddingService: FastapiEmbeddingService,
  ) {}

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  async onModuleInit() {
    const databaseUrl = this.config.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured.');
    }

    // Dedicated pool for vector operations (separate from Prisma)
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      max: VECTOR_POOL_MAX_CONNECTIONS,
      idleTimeoutMillis: VECTOR_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: VECTOR_POOL_CONNECTION_TIMEOUT_MS,
    });

    // Ensure pgvector extension is enabled
    const client = await this.pool.connect();
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    } finally {
      client.release();
    }

    // Verify / create HNSW index for fast similarity search
    await this.ensureHnswIndex();

    this.logger.log('VectorStoreService initialised (table: ipc_chunks_embeddings)');
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Deduplicated similarity search returning the top `k` unique documents
   * filtered by adaptive cosine similarity thresholds.
   */
  async similaritySearchDeduplicated(
    query: string,
    k = 3,
    options?: {
      minSimilarity?: number;
      bypassCache?: boolean;
    },
  ): Promise<[Document, number][]> {
    const { embeddings } = await this.embeddingService.embedTexts({
      texts: [query],
      bypassCache: options?.bypassCache,
    });
    const queryVector = embeddings[0];

    const primaryThreshold =
      options?.minSimilarity ?? VECTOR_SIMILARITY_PRIMARY_THRESHOLD;

    // Stage 1: Primary search with configured or default primary threshold
    let rows = await this.executeVectorQuery(queryVector, k * 3, primaryThreshold);

    // Stage 2: Adaptive fallback if primary threshold yields 0 results
    if (rows.length === 0 && primaryThreshold > VECTOR_SIMILARITY_FALLBACK_THRESHOLD) {
      this.logger.debug(
        { primaryThreshold, fallbackThreshold: VECTOR_SIMILARITY_FALLBACK_THRESHOLD },
        'Zero matches at primary threshold — executing adaptive fallback search',
      );
      rows = await this.executeVectorQuery(queryVector, k * 3, VECTOR_SIMILARITY_FALLBACK_THRESHOLD);
    }

    return this.deduplicateRows(rows, k);
  }

  /**
   * Tier 3: Lexical / Full-Text fallback search directly in PostgreSQL.
   * Runs natively on content and metadata without requiring vector embeddings.
   */
  async lexicalSearch(query: string, k = 3): Promise<[Document, number][]> {
    const keywords = query
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 10);

    const ilikePatterns = keywords.map((w) => `%${w}%`);

    const results = await this.pool.query<{
      content: string;
      metadata: Record<string, unknown>;
      rank: number;
    }>(
      `
      SELECT
        content,
        metadata,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) AS rank
      FROM ipc_chunks_embeddings
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
         OR (ARRAY_LENGTH($2::text[], 1) > 0 AND (content ILIKE ANY($2) OR metadata->>'offense' ILIKE ANY($2)))
      ORDER BY rank DESC
      LIMIT $3
      `,
      [query, ilikePatterns, k * 3],
    );

    return this.deduplicateRows(results.rows, k, 'LEXICAL_FALLBACK');
  }

  private async executeVectorQuery(
    queryVector: number[],
    limit: number,
    threshold: number,
  ) {
    const results = await this.pool.query<{
      content: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }>(
      `
      SELECT
        content,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM ipc_chunks_embeddings
      WHERE 1 - (embedding <=> $1::vector) >= $3
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      [JSON.stringify(queryVector), limit, threshold],
    );
    return results.rows;
  }

  private deduplicateRows(
    rows: Array<{ content: string; metadata: Record<string, unknown>; similarity?: number }>,
    k: number,
    fallbackMode?: string,
  ): [Document, number][] {
    const seenSections = new Set<string>();
    const uniqueResults: [Document, number][] = [];

    for (const row of rows) {
      const sectionKey = (
        (row.metadata as Record<string, unknown>)?.section ||
        row.content.replace(/\s+/g, ' ').trim()
      )
        .toString()
        .toUpperCase();

      if (!seenSections.has(sectionKey)) {
        seenSections.add(sectionKey);
        const metadata = fallbackMode
          ? { ...row.metadata, retrievalMode: fallbackMode }
          : row.metadata;
        const doc: Document = {
          pageContent: row.content,
          metadata,
        };
        const distance = row.similarity !== undefined ? 1 - row.similarity : 0.5;
        uniqueResults.push([doc, distance]);
      }

      if (uniqueResults.length >= k) break;
    }

    return uniqueResults;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private async ensureHnswIndex() {
    // HNSW is optimal for <1M vectors — our IPC corpus is ~500 chunks
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ipc_chunks_embedding_hnsw
      ON ipc_chunks_embeddings
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = ${HNSW_M}, ef_construction = ${HNSW_EF_CONSTRUCTION})
    `);
    this.logger.log('HNSW index verified on ipc_chunks_embeddings');
  }
}

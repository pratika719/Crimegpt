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
   * filtered by a minimum cosine similarity threshold.
   */
  async similaritySearchDeduplicated(
    query: string,
    k = 3,
    minSimilarity = 0.35,
  ): Promise<[Document, number][]> {
    const { embeddings } = await this.embeddingService.embedTexts({ texts: [query] });
    const queryVector = embeddings[0];

    // Over-fetch to ensure enough unique results after deduplication
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
      [JSON.stringify(queryVector), k * 3, minSimilarity],
    );

    const seenSections = new Set<string>();
    const uniqueResults: [Document, number][] = [];

    for (const row of results.rows) {
      const sectionKey = (
        (row.metadata as Record<string, unknown>)?.section ||
        row.content.replace(/\s+/g, ' ').trim()
      )
        .toString()
        .toUpperCase();

      if (!seenSections.has(sectionKey)) {
        seenSections.add(sectionKey);
        const doc: Document = {
          pageContent: row.content,
          metadata: row.metadata,
        };
        uniqueResults.push([doc, 1 - row.similarity]); // convert similarity → distance for consistency
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

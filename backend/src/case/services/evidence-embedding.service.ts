/**
 * Evidence Embedding Service — handles embedding evidence chunks into PGVector.
 *
 * This is a minimal implementation for Phase 6.
 * The full implementation will use the VectorStoreService from the AIModule.
 */

import { Injectable, Logger } from '@nestjs/common';
import { VectorStoreService } from '../../ai/vector/pgvector.service';
import { FastapiEmbeddingService } from '../../embedding/fastapi-embedding.service';
import { EMBEDDING_DIMENSIONS } from '../../ai/constants/ai.constants';

const EXPECTED_EMBEDDING_DIMENSIONS = EMBEDDING_DIMENSIONS; // 384 — single source in ai.constants

@Injectable()
export class EvidenceEmbeddingService {
  private readonly logger = new Logger(EvidenceEmbeddingService.name);

  constructor(
    private readonly vectorStore: VectorStoreService,
    private readonly embeddingService: FastapiEmbeddingService,
  ) {}

  /**
   * Upsert a single evidence chunk with its embedding.
   */
  async upsertEvidenceChunk(input: {
    evidenceId: string;
    caseId: string;
    chunkIndex: number;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    evidenceId: string;
    caseId: string;
    chunkIndex: number;
    embedded: boolean;
  }> {
    const content = input.content.trim();

    if (!content) {
      throw new Error('Cannot embed empty evidence chunk.');
    }

    const { embeddings } = await this.embeddingService.embedTexts({
      texts: [content],
    });

    const vector = embeddings[0];

    if (!vector || vector.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Invalid embedding dimensions. Expected ${EXPECTED_EMBEDDING_DIMENSIONS}, received ${vector?.length ?? 0}.`,
      );
    }

    // TODO: Use vectorStore.pool to INSERT the vector directly
    this.logger.debug(
      {
        evidenceId: input.evidenceId,
        caseId: input.caseId,
        chunkIndex: input.chunkIndex,
      },
      'Evidence chunk embedded (vector store integration pending)',
    );

    return {
      evidenceId: input.evidenceId,
      caseId: input.caseId,
      chunkIndex: input.chunkIndex,
      embedded: true,
    };
  }
}

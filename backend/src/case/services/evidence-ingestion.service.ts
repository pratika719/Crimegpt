/**
 * Evidence Ingestion Service — handles chunking and queuing evidence for embedding.
 *
 * This is a minimal implementation for Phase 6.
 * The full implementation will use the QueueService for job queuing.
 */

import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../../queue/queue.service';
import { QUEUE_NAMES } from '../../queue/queue-names';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

@Injectable()
export class EvidenceIngestionService {
  private readonly logger = new Logger(EvidenceIngestionService.name);

  constructor(private readonly queueService: QueueService) {}

  /**
   * Ingest evidence text: chunk it and queue embedding jobs.
   */
  async ingestEvidenceText(input: {
    evidenceId: string;
    caseId: string;
    userId: string;
    text: string;
  }): Promise<{
    evidenceId: string;
    caseId: string;
    chunksQueued: number;
  }> {
    const chunks = this.chunkText(input.text);

    let queuedCount = 0;

    for (const chunk of chunks) {
      try {
        await this.queueService.addJob(QUEUE_NAMES.EMBEDDING, {
          requestId: `${input.evidenceId}-${chunk.index}`,
          userId: input.userId,
          createdAt: new Date().toISOString(),
          sourceType: 'EVIDENCE',
          sourceId: input.evidenceId,
          caseId: input.caseId,
          text: chunk.content,
          chunkIndex: chunk.index,
        });
        queuedCount++;
      } catch (err) {
        this.logger.error(
          { err, evidenceId: input.evidenceId, chunkIndex: chunk.index },
          'Failed to queue embedding job',
        );
      }
    }

    this.logger.debug(
      {
        evidenceId: input.evidenceId,
        caseId: input.caseId,
        totalChunks: chunks.length,
        queuedCount,
      },
      'Evidence text chunked and embedding jobs queued',
    );

    return {
      evidenceId: input.evidenceId,
      caseId: input.caseId,
      chunksQueued: queuedCount,
    };
  }

  /**
   * Chunk text into overlapping segments.
   */
  private chunkText(
    text: string,
  ): Array<{ content: string; index: number }> {
    const chunks: Array<{ content: string; index: number }> = [];
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    if (normalizedText.length === 0) {
      return chunks;
    }

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < normalizedText.length) {
      const endIndex = Math.min(
        startIndex + CHUNK_SIZE,
        normalizedText.length,
      );

      const chunk = normalizedText.slice(startIndex, endIndex).trim();

      if (chunk.length > 0) {
        chunks.push({ content: chunk, index: chunkIndex++ });
      }

      // Move forward by chunk size minus overlap
      startIndex += CHUNK_SIZE - CHUNK_OVERLAP;

      // Prevent infinite loop if overlap >= chunk size
      if (startIndex >= normalizedText.length) break;
    }

    return chunks;
  }
}

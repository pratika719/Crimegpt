import { Document } from "@langchain/core/documents";
import { createVectorStore } from "@/ai/vector/pgvector";


export class EvidenceEmbeddingService {
  async upsertEvidenceChunk(input: {
    evidenceId: string;
    caseId: string;
    chunkIndex: number;
    content: string;
    metadata?: Record<string, unknown>;
  }) {
    const vectorStore = await createVectorStore();

    const document = new Document({
      pageContent: input.content,
      metadata: {
        sourceType: "EVIDENCE",
        evidenceId: input.evidenceId,
        caseId: input.caseId,
        chunkIndex: input.chunkIndex,
        ...(input.metadata ?? {}),
      },
    });

    await vectorStore.addDocuments([document]);

    return {
      evidenceId: input.evidenceId,
      caseId: input.caseId,
      chunkIndex: input.chunkIndex,
      embedded: true,
    };
  }

  async upsertEvidenceChunks(
    chunks: Array<{
      evidenceId: string;
      caseId: string;
      chunkIndex: number;
      content: string;
      metadata?: Record<string, unknown>;
    }>,
  ) {
    const vectorStore = await createVectorStore();

    const documents = chunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk.content,
          metadata: {
            sourceType: "EVIDENCE",
            evidenceId: chunk.evidenceId,
            caseId: chunk.caseId,
            chunkIndex: chunk.chunkIndex,
            ...(chunk.metadata ?? {}),
          },
        }),
    );

    if (documents.length === 0) {
      return {
        embeddedCount: 0,
      };
    }

    await vectorStore.addDocuments(documents);

    return {
      embeddedCount: documents.length,
    };
  }
}

export const evidenceEmbeddingService = new EvidenceEmbeddingService();
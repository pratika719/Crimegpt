import { Document } from "@langchain/core/documents";
import { createVectorStoreForStorage } from "@/ai/vector/pgvector";
import { getEmbeddingProvider } from "@/ai/embeddings/embedding-provider.factory";

const EXPECTED_EMBEDDING_DIMENSIONS = 384;

function assertVector(vector: number[] | undefined): asserts vector is number[] {
  if (!vector) {
    throw new Error("Embedding provider returned no vector.");
  }

  if (vector.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid embedding dimensions. Expected ${EXPECTED_EMBEDDING_DIMENSIONS}, received ${vector.length}.`,
    );
  }
}

export class EvidenceEmbeddingService {
  async upsertEvidenceChunk(input: {
    evidenceId: string;
    caseId: string;
    chunkIndex: number;
    content: string;
    metadata?: Record<string, unknown>;
  }) {
    const content = input.content.trim();

    if (!content) {
      throw new Error("Cannot embed empty evidence chunk.");
    }

    const embeddingProvider = getEmbeddingProvider();

    const embeddingResult = await embeddingProvider.embedTexts({
      texts: [content],
    });

    const vector = embeddingResult.embeddings[0];
    assertVector(vector);

    const vectorStore = await createVectorStoreForStorage();

    const document = new Document({
      pageContent: content,
      metadata: {
        sourceType: "EVIDENCE",
        evidenceId: input.evidenceId,
        caseId: input.caseId,
        chunkIndex: input.chunkIndex,
        model: embeddingResult.model,
        dimensions: embeddingResult.dimensions,
        ...(input.metadata ?? {}),
      },
    });

    await vectorStore.addVectors([vector], [document]);

    return {
      evidenceId: input.evidenceId,
      caseId: input.caseId,
      chunkIndex: input.chunkIndex,
      embedded: true,
      model: embeddingResult.model,
      dimensions: embeddingResult.dimensions,
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
    const validChunks = chunks
      .map((chunk) => ({ ...chunk, content: chunk.content.trim() }))
      .filter((chunk) => chunk.content.length > 0);

    if (validChunks.length === 0) {
      return { embeddedCount: 0 };
    }

    const embeddingProvider = getEmbeddingProvider();

    const embeddingResult = await embeddingProvider.embedTexts({
      texts: validChunks.map((chunk) => chunk.content),
    });

    if (embeddingResult.embeddings.length !== validChunks.length) {
      throw new Error(
        `Embedding count mismatch. Expected ${validChunks.length}, received ${embeddingResult.embeddings.length}.`,
      );
    }

    for (const vector of embeddingResult.embeddings) {
      assertVector(vector);
    }

    const vectorStore = await createVectorStoreForStorage();

    const documents = validChunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk.content,
          metadata: {
            sourceType: "EVIDENCE",
            evidenceId: chunk.evidenceId,
            caseId: chunk.caseId,
            chunkIndex: chunk.chunkIndex,
            model: embeddingResult.model,
            dimensions: embeddingResult.dimensions,
            ...(chunk.metadata ?? {}),
          },
        }),
    );

    await vectorStore.addVectors(embeddingResult.embeddings, documents);

    return {
      embeddedCount: documents.length,
      model: embeddingResult.model,
      dimensions: embeddingResult.dimensions,
    };
  }
}

export const evidenceEmbeddingService = new EvidenceEmbeddingService();
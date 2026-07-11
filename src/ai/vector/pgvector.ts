import { PGVectorStore } from "@langchain/pgvector";
import { pool as sharedPool } from "@/lib/prisma";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import dotenv from "dotenv";
import { Embeddings } from "@langchain/core/embeddings";
import { getEmbeddingProvider } from "@/ai/embeddings/embedding-provider.factory";

// Load environment variables for standalone scripts or Next.js boundary
dotenv.config();

class NoopEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  async embedDocuments(): Promise<number[][]> {
    throw new Error("NoopEmbeddings cannot embed documents. Use FastAPI provider.");
  }

  async embedQuery(): Promise<number[]> {
    throw new Error("NoopEmbeddings cannot embed queries. Use FastAPI provider.");
  }
}

let vectorStoreInstance: PGVectorStore | null = null;

/**
 * Returns the shared pg.Pool instance (sourced from lib/prisma.ts).
 * Kept for backwards compatibility with any callers that use getPool() directly.
 */
export function getPool() {
  return sharedPool;
}

/**
 * Connects to PostgreSQL, checks/enables the pgvector extension,
 * and initializes the PGVectorStore singleton.
 * 
 * @returns Reusable PGVectorStore instance.
 */
export async function createVectorStoreForStorage(): Promise<PGVectorStore> {
  if (vectorStoreInstance) {
    return vectorStoreInstance;
  }

  try {
    const dbPool = sharedPool;

    // Verify pgvector extension is enabled
    const client = await dbPool.connect();
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    } finally {
      client.release();
    }

    // Initialize the vector store using our NoopEmbeddings placeholder
    vectorStoreInstance = await PGVectorStore.initialize(new NoopEmbeddings(), {
      pool: dbPool,
      tableName: "ipc_chunks_embeddings",
      schemaName: "public",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata",
      },
      distanceStrategy: "cosine", // Recommended metric for text embeddings
      dimensions: 384,            // MiniLM-L6-v2 outputs 384 dimensions
    });

    console.log("⚡ PGVectorStore initialized successfully (Table: ipc_chunks_embeddings)");
    return vectorStoreInstance;
  } catch (error) {
    console.error("❌ Failed to initialize PGVectorStore:", error);
    throw error;
  }
}

export async function createVectorStore(): Promise<PGVectorStore> {
  return createVectorStoreForStorage();
}

/**
 * Input configuration for DeduplicatedVectorStoreRetriever.
 */
export interface DeduplicatedVectorStoreRetrieverInput extends BaseRetrieverInput {
  store: PGVectorStore;
  k: number;
}

/**
 * Custom LangChain retriever that deduplicates retrieved documents by pageContent
 * to prevent returning duplicate semantic chunks during similarity search.
 */
export class DeduplicatedVectorStoreRetriever extends BaseRetriever {
  lc_namespace = ["src", "ai", "vector"];
  private store: PGVectorStore;
  private k: number;

  constructor(fields: DeduplicatedVectorStoreRetrieverInput) {
    super(fields);
    this.store = fields.store;
    this.k = fields.k;
  }

  async _getRelevantDocuments(
    query: string,
    _runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    const embeddingProvider = getEmbeddingProvider();
    const embeddingResult = await embeddingProvider.embedTexts({
      texts: [query],
    });
    const queryVector = embeddingResult.embeddings[0];

    // Retrieve k * 2 candidates to ensure we have enough unique documents
    const resultsWithScores = await this.store.similaritySearchVectorWithScore(queryVector, this.k * 2);
    
    const seen = new Set<string>();
    const uniqueDocs: Document[] = [];

    for (const [doc] of resultsWithScores) {
      const normalizedContent = doc.pageContent.replace(/\s+/g, " ").trim();
      if (!seen.has(normalizedContent)) {
        seen.add(normalizedContent);
        uniqueDocs.push(doc);
      }
      
      if (uniqueDocs.length >= this.k) {
        break;
      }
    }

    return uniqueDocs;
  }
}

/**
 * Returns a LangChain retriever interface configured to fetch deduplicated top `k` similar chunks.
 * 
 * @param k The number of documents to retrieve (default is 4).
 */
export async function getRetriever(k = 4) {
  const store = await createVectorStore();
  return new DeduplicatedVectorStoreRetriever({
    store,
    k,
  });
}

/**
 * Performs deduplicated similarity search returning the top `k` unique documents and their scores.
 * 
 * @param query The search query string.
 * @param k The number of unique documents to return (default is 3).
 */
export async function similaritySearchDeduplicated(
  query: string, 
  k = 3, 
  minSimilarity = 0.35
): Promise<[Document, number][]> {
  const store = await createVectorStoreForStorage();

  const embeddingProvider = getEmbeddingProvider();
  const embeddingResult = await embeddingProvider.embedTexts({
    texts: [query],
  });
  const queryVector = embeddingResult.embeddings[0];
  
  // Retrieve k * 2 candidates to account for potential duplicates
  const results = await store.similaritySearchVectorWithScore(queryVector, k * 2);
  
  const seen = new Set<string>();
  const uniqueResults: [Document, number][] = [];

  for (const [doc, score] of results) {
    // score returned is cosine distance. Cosine similarity = 1 - cosine distance.
    const similarity = 1 - score;
    if (similarity < minSimilarity) {
      continue;
    }

    const normalizedContent = doc.pageContent.replace(/\s+/g, " ").trim();
    if (!seen.has(normalizedContent)) {
      seen.add(normalizedContent);
      uniqueResults.push([doc, score]);
    }
    
    if (uniqueResults.length >= k) {
      break;
    }
  }

  return uniqueResults;
}

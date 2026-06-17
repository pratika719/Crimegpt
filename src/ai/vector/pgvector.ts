import { PGVectorStore } from "@langchain/pgvector";
import { Pool } from "pg";
import { embeddings } from "../embeddings/minilm.embeddings";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import dotenv from "dotenv";

// Load environment variables for standalone scripts or Next.js boundary
dotenv.config();

let pool: Pool | null = null;
let vectorStoreInstance: PGVectorStore | null = null;

/**
 * Returns a configured pg.Pool connection singleton.
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not defined in environment variables. Please check your .env file."
      );
    }

    pool = new Pool({
      connectionString,
      // Production pool configurations
      max: 10,                 // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Timeout if connection takes more than 5s
      ssl: connectionString.includes("sslmode=require") || connectionString.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : false,
    });
  }
  return pool;
}

/**
 * Connects to PostgreSQL, checks/enables the pgvector extension,
 * and initializes the PGVectorStore singleton.
 * 
 * @returns Reusable PGVectorStore instance.
 */
export async function createVectorStore(): Promise<PGVectorStore> {
  if (vectorStoreInstance) {
    return vectorStoreInstance;
  }

  try {
    const dbPool = getPool();

    // Verify pgvector extension is enabled
    const client = await dbPool.connect();
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    } finally {
      client.release();
    }

    // Initialize the vector store using our local MiniLM embedding model singleton
    vectorStoreInstance = await PGVectorStore.initialize(embeddings, {
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
    // Retrieve k * 2 candidates to ensure we have enough unique documents
    const resultsWithScores = await this.store.similaritySearchWithScore(query, this.k * 2);
    
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
export async function similaritySearchDeduplicated(query: string, k = 3): Promise<[Document, number][]> {
  const store = await createVectorStore();
  
  // Retrieve k * 2 candidates to account for potential duplicates
  const results = await store.similaritySearchWithScore(query, k * 2);
  
  const seen = new Set<string>();
  const uniqueResults: [Document, number][] = [];

  for (const [doc, score] of results) {
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

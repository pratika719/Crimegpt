import { loadIPCDocuments } from "./loader/ipc.loader";
import { splitLegalDocuments } from "./splitters/legal.splitter";
import { createVectorStore, getPool } from "../vector/pgvector";
import { embeddings } from "@/ai/embeddings/minilm.embeddings";

/**
 * Main ingestion script to orchestrate the RAG document processing pipeline.
 */
async function main() {
  console.log("🚀 Starting CrimeGPT Law Ingestion Pipeline...\n");
  const startTime = Date.now();

  try {
    // Step 1: Load IPC Documents from CSV
    console.log("📂 Step 1/3: Loading IPC sections from CSV...");
    const docs = await loadIPCDocuments();
    console.log(`✅ Loaded ${docs.length} raw IPC documents.`);

    if (docs.length === 0) {
      console.warn("⚠️ No documents loaded. Exiting pipeline.");
      process.exit(0);
    }

    // Step 2: Split the documents into manageable chunks
    console.log("\n✂️ Step 2/3: Splitting legal documents into semantic chunks...");
    const chunks = await splitLegalDocuments(docs);
    console.log(`✅ Generated ${chunks.length} legal text chunks.`);

    // Step 3: Embed and store chunks in PostgreSQL via pgvector
    console.log("\n💾 Step 3/3: Connecting to PostgreSQL database & initializing PGVector...");
    const store = await createVectorStore();

    // Batch insertion to store chunks in database
    // Note: Since all-MiniLM-L6-v2 runs locally on CPU, there are no API rate limits.
    // We can use a larger batch size (50) and a minimal 200ms delay to keep DB pool connections stable.
    const batchSize = 50;
    const totalBatches = Math.ceil(chunks.length / batchSize);
    console.log(`📤 Ingesting chunks into 'ipc_chunks_embeddings' table (Batch Size: ${batchSize})...`);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const progress = (((i + batch.length) / chunks.length) * 100).toFixed(1);
      
      console.log(`   [Batch ${batchNum}/${totalBatches}] Storing ${batch.length} chunks (${progress}% completed)...`);
      await store.addDocuments(batch);

      // Short sleep to yield event loop and stabilize Postgres connection pool
      if (i + batchSize < chunks.length) {
        await sleep(200);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 Ingestion pipeline completed successfully in ${duration}s!`);
    console.log(`📊 Successfully stored and indexed ${chunks.length} chunks.`);

    // Clean up connections using the store's end method
    console.log("🔌 Closing database connection pool...");
    await store.end();
    console.log("👋 Done!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Critical Failure in Ingestion Pipeline:", error);
    process.exit(1);
  }
}

// Run the script
main();

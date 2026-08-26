import dotenv from "dotenv";
dotenv.config();

import { cacheService } from "@/lib/cache/cache";

async function main() {
  console.log("🧹 Clearing CrimeGPT Legal Retrieval & Embedding Cache from Redis...\n");

  try {
    const lawRetrievalPattern = "crimegpt:cache:law-retrieval:*";
    const embeddingPattern = "crimegpt:cache:query-embedding:*";

    await cacheService.delPattern(lawRetrievalPattern);
    await cacheService.delPattern(embeddingPattern);

    console.log("✅ Successfully cleared legal retrieval & embedding cache patterns from Redis!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to clear Redis cache:", error);
    process.exit(1);
  }
}

main();

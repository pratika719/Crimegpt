import { similaritySearchDeduplicated, getPool } from "../ai/vector/pgvector";
import dotenv from "dotenv";

// Load env variables
dotenv.config();

async function main() {
  const query = "Someone impersonated an army officer.";
  console.log(`🔍 Querying PGVector for deduplicated similarity search...`);
  console.log(`   Query: "${query}"\n`);

  try {
    // Run deduplicated similarity search returning the top 3 unique documents along with their scores
    // By default, cosine distance is used: lower score = closer distance = more similar
    const results = await similaritySearchDeduplicated(query, 3);

    console.log(`📊 Found ${results.length} unique matching results:\n`);
    console.log("==================================================");

    results.forEach(([doc, score], index) => {
      console.log(`\n[Rank ${index + 1}] Score (Cosine Distance): ${score.toFixed(6)}`);
      console.log(`Section:     ${doc.metadata.section || "N/A"}`);
      console.log(`Offense:     ${doc.metadata.offense || "N/A"}`);
      console.log(`Punishment:  ${doc.metadata.punishment || "N/A"}`);
      console.log(`Source:      ${doc.metadata.source || "N/A"}`);
      console.log(`\nPage Content Preview:`);
      console.log(`--------------------------------------------------`);
      console.log(doc.pageContent.substring(0, 350) + "...");
      console.log("==================================================");
    });

    console.log(`\n✅ Retrieval test completed successfully!`);

    // Clean up database connections using the pool
    const pool = getPool();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Retrieval test failed:", error);
    process.exit(1);
  }
}

main();

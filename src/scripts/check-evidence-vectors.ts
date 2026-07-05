import "dotenv/config";
import { pool } from "@/lib/prisma";

async function main() {
  const result = await pool.query(`
    SELECT id, content, metadata 
    FROM ipc_chunks_embeddings 
    WHERE (metadata->>'sourceType') = 'EVIDENCE'
    LIMIT 10
  `);

  console.log(`\n=== Found ${result.rowCount} evidence vectors in pgvector ===`);

  for (const row of result.rows) {
    console.log(`\nRow ID: ${row.id}`);
    console.log(`Content snippet: "${row.content.substring(0, 100).trim()}..."`);
    console.log(`Metadata:`, JSON.stringify(row.metadata, null, 2));

    const meta = row.metadata || {};
    if (meta.caseId && meta.evidenceId && meta.chunkIndex !== undefined) {
      console.log(`✅ Valid: caseId, evidenceId, and chunkIndex exist.`);
    } else {
      console.log(`❌ Invalid: missing caseId, evidenceId, or chunkIndex.`);
    }
  }

  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Vector check failed:", error);
    process.exit(1);
  });

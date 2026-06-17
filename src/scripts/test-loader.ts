import { loadIPCDocuments } from "../ai/ingestion/loader/ipc.loader";
import { splitLegalDocuments } from "../ai/ingestion/splitters/legal.splitter";

async function main() {
  console.log("🚀 Starting Ingestion Pipeline Phase 2A Test...\n");

  try {
    // 1. Load documents
    console.log("📂 Loading IPC sections from CSV...");
    const docs = await loadIPCDocuments();
    console.log(`\n📊 Total Documents Loaded: ${docs.length}`);

    if (docs.length === 0) {
      console.warn("⚠️ No documents were loaded. Check the CSV path or content.");
      return;
    }

    // Print first document details
    console.log("\n📄 First Loaded Document Example:");
    console.log("--------------------------------------------------");
    console.log(`Metadata: ${JSON.stringify(docs[0].metadata, null, 2)}`);
    console.log("--------------------------------------------------");
    console.log(`Page Content:\n${docs[0].pageContent}`);
    console.log("--------------------------------------------------");

    // 2. Run Splitter
    console.log("\n✂️ Splitting legal documents into chunks...");
    const chunks = await splitLegalDocuments(docs);
    console.log(`\n📊 Total Chunks Generated: ${chunks.length}`);

    if (chunks.length === 0) {
      console.warn("⚠️ No chunks were generated. Check the text splitter settings.");
      return;
    }

    // Print first chunk details
    console.log("\n🧩 First Chunk Example:");
    console.log("--------------------------------------------------");
    console.log(`Metadata: ${JSON.stringify(chunks[0].metadata, null, 2)}`);
    console.log("--------------------------------------------------");
    console.log(`Page Content:\n${chunks[0].pageContent}`);
    console.log("--------------------------------------------------");

    console.log("\n✅ Test finished successfully!");

  } catch (error) {
    console.error("\n❌ Error during execution of the test script:", error);
    process.exit(1);
  }
}

main();

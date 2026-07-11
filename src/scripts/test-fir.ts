import dotenv from "dotenv";
import { DocumentRegistry } from "../services/document-engine/document-registry";
import { lawRetriever } from "../ai/retrievers/law.retriever";
import { geminiProvider } from "../ai/providers/gemini-provider";
import { DocumentType } from "@/generated/prisma/client";

// Load environment variables
dotenv.config();

async function main() {
  const mockNarrative = 
    "Yesterday evening at around 8:00 PM, while walking near the sector 15 market, " +
    "a man approached me and claimed he was a senior army officer. He wore a replica uniform " +
    "and demanded that I hand over my phone and wallet for security verification. " +
    "I trusted him because of the uniform, but he took my belongings and ran away in a red car.";

  const mockContext: any = {
    caseId: "mock-case-id",
    title: "Mock Case Title",
    narrative: mockNarrative,
    status: "OPEN",
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: null,
    investigationProfile: null,
    persons: [],
    victims: [],
    accused: [],
    witnesses: [],
    vehicles: [],
    seizedItems: [],
    medicalInfos: [],
    courtInfos: [],
    evidence: [],
    checklist: [],
    documents: [],
    activities: [],
  };

  console.log(`🤖 [Test FIR Generation] Running FIR generation from Registry configuration...`);
  console.log(`   Mock Case Narrative: "${mockNarrative}"\n`);

  try {
    const startTime = Date.now();
    
    // 1. Get registry configuration for FIR
    const config = DocumentRegistry.getConfig(DocumentType.FIR);

    // 2. Retrieve law chunks
    let retrievedChunks: any[] = [];
    if (config.requiresRAG) {
      console.log(`🔍 Retrieving PGVector legal context chunks...`);
      retrievedChunks = await lawRetriever.retrieve(mockContext.narrative, 5);
      console.log(`🔍 Retrieved ${retrievedChunks.length} chunks.`);
    }

    // 3. Build prompt
    const promptText = config.buildPrompt(mockContext, retrievedChunks);

    // 4. Query model
    const modelUsed = geminiProvider.getModelName();
    console.log(`🤖 Dispatching prompt to ${modelUsed}...`);
    const { text: rawResponse } = await geminiProvider.generateJSON(promptText);

    const latencyMs = Date.now() - startTime;
    console.log(`✅ AI responded in ${latencyMs}ms!`);

    // 5. Parse and validate
    const rawData = JSON.parse(rawResponse);
    const result = config.schema.parse(rawData);

    console.log(`\n📄 Generated FIR Document:`);
    console.log(`==================================================`);
    console.log(`Complaint Summary:        ${result.complaintSummary}`);
    console.log(`Incident Date:           ${result.incidentDate}`);
    console.log(`Incident Location:       ${result.incidentLocation}`);
    console.log(`Suspected Offenses:      ${result.suspectedOffenses.join(", ")}`);
    console.log(`Applicable Sections:     `);
    result.applicableSections.forEach((sec: any) => {
      console.log(`  - Section: ${sec.section}`);
      console.log(`    Reason:  ${sec.reason}`);
    });
    console.log(`Facts of Case:           ${result.factsOfCase}`);
    console.log(`Investigation Directions: ${result.investigationDirections}`);
    console.log(`Officer Remarks:         ${result.officerRemarks}`);
    console.log(`==================================================`);

    console.log(`\n📚 Retrieved Chunks Context (${retrievedChunks.length} chunks):`);
    retrievedChunks.forEach((chunk, idx) => {
      console.log(`  [Chunk ${idx + 1}] Source: ${chunk.source}, Section: ${chunk.section}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ FIR test execution failed:", error);
    process.exit(1);
  }
}

main();

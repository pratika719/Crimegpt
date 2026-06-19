import { firGenerationChain } from "../ai/chains/fir-generation.chain";
import dotenv from "dotenv";

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

  console.log(`🤖 [Test FIR Generation] Running FIR generation chain...`);
  console.log(`   Mock Case Narrative: "${mockNarrative}"\n`);

  try {
    const output = await firGenerationChain.execute(mockContext);

    console.log(`✅ Chain Executed Successfully in ${output.latencyMs}ms!`);
    console.log(`🤖 Model Used: ${output.modelUsed}`);
    console.log(`\n📄 Generated FIR Document:`);
    console.log(`==================================================`);
    console.log(`Complaint Summary:        ${output.result.complaintSummary}`);
    console.log(`Incident Date:           ${output.result.incidentDate}`);
    console.log(`Incident Location:       ${output.result.incidentLocation}`);
    console.log(`Suspected Offenses:      ${output.result.suspectedOffenses.join(", ")}`);
    console.log(`Applicable Sections:     `);
    output.result.applicableSections.forEach((sec, i) => {
      console.log(`  - Section: ${sec.section}`);
      console.log(`    Reason:  ${sec.reason}`);
    });
    console.log(`Facts of Case:           ${output.result.factsOfCase}`);
    console.log(`Investigation Directions: ${output.result.investigationDirections}`);
    console.log(`Officer Remarks:         ${output.result.officerRemarks}`);
    console.log(`==================================================`);

    console.log(`\n📚 Retrieved Chunks Context (${output.retrievedChunks.length} chunks):`);
    output.retrievedChunks.forEach((chunk, idx) => {
      console.log(`  [Chunk ${idx + 1}] Source: ${chunk.source}, Section: ${chunk.section}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ FIR test execution failed:", error);
    process.exit(1);
  }
}

main();

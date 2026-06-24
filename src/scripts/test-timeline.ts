import "dotenv/config";
import { prisma } from "../lib/prisma";
import { CaseService } from "../services/case/case.services";
import { caseMetadataService } from "../services/case-metadata/case-metadata.service";
import { investigationSummaryService } from "../services/investigation-summary/investigation-summary.service";
import { caseActivityRepository } from "../repositories/case-activity.repository";

// Instantiated CaseService class
const service = new CaseService();

async function main() {
  console.log("🚀 Starting Case Activity Timeline End-to-End Test...");

  try {
    // 0. Create test user
    console.log("📂 Step 0: Creating test user...");
    const testUser = await prisma.user.create({
      data: {
        email: `test-timeline-${Date.now()}@example.com`,
        name: "Test Timeline User",
      },
    });

    // 1. Create case dossier
    console.log("📂 Step 1: Registering case dossier (should trigger CASE_CREATED)...");
    const testCase = await service.createCase(testUser.id, {
      title: "Test Dossier: Impersonation & Wallet Theft",
      narrative: 
        "Yesterday evening at 8:00 PM near Sector 15 market, a man in a replica police uniform stopped me " +
        "and claimed he was conducting security checks. He asked me to hand over my wallet and phone. " +
        "I complied, and he immediately fled on a motorbike with my belongings.",
    });
    console.log(`   Dossier registered. ID: ${testCase.id}`);

    // 2. Create metadata profile
    console.log("📂 Step 2: Creating metadata profile (should trigger METADATA_CREATED)...");
    await caseMetadataService.upsertMetadata(testCase.id, testUser.id, {
      incidentDate: new Date(),
      incidentLocation: "Sector 15 Market",
      victimName: "John Doe",
    });

    // 3. Update metadata profile
    console.log("📂 Step 3: Updating metadata profile (should trigger METADATA_UPDATED)...");
    await caseMetadataService.upsertMetadata(testCase.id, testUser.id, {
      incidentDate: new Date(),
      incidentLocation: "Sector 15 Market Main Entrance",
      victimName: "John Doe",
      suspectDescription: "Male, wearing fake police khaki uniform, riding a black Hero Splendor motorcycle.",
    });

    // 4. Generate Investigation Summary
    console.log("📂 Step 4: Compiling summary document (should trigger INVESTIGATION_SUMMARY_GENERATED)...");
    await investigationSummaryService.generateSummary(testCase.id, testUser.id);

    // 5. Query and display logged timeline activities
    console.log("\n📊 Step 5: Querying database CaseActivity logs...");
    const logs = await caseActivityRepository.findByCaseId(testCase.id, testUser.id);
    
    console.log(`\n==================================================`);
    console.log(`FOUND ${logs.length} TIMELINE LOG ENTRIES:`);
    console.log(`==================================================`);
    logs.forEach((log:any, i:any) => {
      console.log(`[Event ${i + 1}] Type: ${log.activityType}`);
      console.log(`   Description: ${log.description}`);
      console.log(`   Timestamp:   ${log.createdAt.toLocaleTimeString()}`);
      console.log("--------------------------------------------------");
    });
    console.log(`==================================================`);

    // 6. Clean up
    console.log("\n🧹 Step 6: Purging test user and cascading records...");
    await prisma.user.delete({
      where: {
        id: testUser.id,
      },
    });
    console.log("   Test data deleted successfully.");

    process.exit(0);
  } catch (error) {
    console.error("❌ E2E Timeline test failed:", error);
    process.exit(1);
  }
}

main();

import "dotenv/config";
import { prisma } from "../lib/prisma";
import { CaseService } from "../services/case/case.services";
import { checklistService } from "../services/checklist/checklist.service";
import { caseActivityRepository } from "../repositories/case-activity.repository";

const caseService = new CaseService();

async function main() {
  console.log("🚀 Starting Investigation Checklist End-to-End Test...");

  try {
    // 1. Create a test case dossier
    console.log("📂 Step 1: Registering case dossier...");
    const testCase = await caseService.createCase({
      title: "Test Checklist Case",
      narrative: "An investigation checklist integration test narrative.",
    });
    console.log(`   Dossier registered. ID: ${testCase.id}`);

    // 2. Create checklist items
    console.log("📂 Step 2: Creating checklist items...");
    const item1 = await checklistService.createChecklistItem(testCase.id, {
      title: "Aquire CCTV footage of scene",
    });
    console.log(`   Item 1 created: "${item1.title}" (ID: ${item1.id})`);

    const item2 = await checklistService.createChecklistItem(testCase.id, {
      title: "Conduct witness verification",
    });
    console.log(`   Item 2 created: "${item2.title}" (ID: ${item2.id})`);

    // 3. Toggle item1 status to completed
    console.log("📂 Step 3: Toggling Item 1 to completed (should trigger CHECKLIST_ITEM_COMPLETED timeline log)...");
    const item1Completed = await checklistService.updateChecklistItem(item1.id, {
      completed: true,
    });
    console.log(`   Item 1 updated. Completed: ${item1Completed.completed}, CompletedAt: ${item1Completed.completedAt}`);

    // 4. Verify activity log
    console.log("📂 Step 4: Verifying case activity log...");
    const activities = await caseActivityRepository.findByCaseId(testCase.id);
    const completedActivity = activities.find(act => act.activityType === "CHECKLIST_ITEM_COMPLETED");

    if (completedActivity) {
      console.log(`   ✅ Success! Found activity log: ${completedActivity.description}`);
    } else {
      throw new Error("❌ Failed to find CHECKLIST_ITEM_COMPLETED activity log in database.");
    }

    // 5. Toggle item1 back to incomplete
    console.log("📂 Step 5: Toggling Item 1 back to incomplete (should nullify completedAt)...");
    const item1Incomplete = await checklistService.updateChecklistItem(item1.id, {
      completed: false,
    });
    console.log(`   Item 1 updated. Completed: ${item1Incomplete.completed}, CompletedAt: ${item1Incomplete.completedAt}`);
    
    if (item1Incomplete.completedAt === null) {
      console.log("   ✅ Success! completedAt has been nullified.");
    } else {
      throw new Error(`❌ failed to nullify completedAt. Value: ${item1Incomplete.completedAt}`);
    }

    // 6. Delete item2
    console.log("📂 Step 6: Deleting Item 2...");
    await checklistService.deleteChecklistItem(item2.id);
    console.log("   Item 2 deleted.");

    // Verify item2 is deleted
    const items = await checklistService.getChecklistByCaseId(testCase.id);
    if (items.some(item => item.id === item2.id)) {
      throw new Error("❌ Item 2 still exists in the database.");
    } else {
      console.log("   ✅ Success! Item 2 was deleted.");
    }

    // 7. Clean up
    console.log("📂 Step 7: Purging test case dossier...");
    await prisma.case.delete({
      where: { id: testCase.id }
    });
    console.log("   Dossier and checklist items cascadingly deleted successfully.");
    console.log("🎉 E2E Checklist test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ E2E Checklist test failed:", error);
    process.exit(1);
  }
}

main();

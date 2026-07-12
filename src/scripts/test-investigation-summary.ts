import "dotenv/config";
import { prisma } from "../lib/prisma";
import { caseMetadataService } from "../services/case-metadata/case-metadata.service";
import { documentGeneratorService } from "../services/document-engine/document-generator.service";
import { DocumentType } from "@/generated/prisma/client";

async function main() {
  console.log("🚀 Starting Investigation Summary RAG Test Pipeline...");

  try {
    // 1. Create a dummy case to run the summary test against
    console.log("📂 Step 1: Creating a test case dossier...");
    const testCase = await prisma.case.create({
      data: {
        title: "Test Case: Unauthorized Bank Account Access & Fund Drain",
        narrative: 
          "Yesterday morning at 10:00 AM, the complainant received an SMS alert indicating that INR 5,00,000 " +
          "was transferred from their bank account to an unknown recipient. The complainant states they never " +
          "authorized this transaction, shared their OTP, or received any call. The suspect is believed to have " +
          "used a phishing link disguised as a bank KYC update, which the victim clicked the night before. " +
          "The victim believes the phisher is named 'Rajesh Verma' who had called them posing as a bank manager.",
        userId: "cmr4p4vq30000hockjtrgqv3d",
      },
    });
    console.log(`   Created Case ID: ${testCase.id}`);

    // 2. Add structured case metadata using the service
    console.log("📂 Step 2: Populating case investigation metadata...");
    const metadata = await caseMetadataService.upsertMetadata(testCase.id, "cmr4p4vq30000hockjtrgqv3d", {
      incidentDate: new Date("2026-06-16"),
      incidentTime: "10:00 AM",
      incidentLocation: "Online Banking Portal / Victim's Residence in Dwarka, Delhi",
      victimName: "Amit Sharma",
      victimStatement: 
        "I clicked on a link that came in a text message claiming my bank account would be blocked if I didn't update my KYC. " +
        "I entered my card details and net banking password. The next morning, I saw INR 5,00,000 debited without my consent.",
      suspectName: "Rajesh Verma (Alias)",
      suspectDescription: "Caller posing as SBI Bank Manager, used phone number +91 99999 88888.",
      witnessInformation: "Victim's spouse, Priya Sharma, who witnessed him receiving the call and clicking the link.",
      evidenceSummary: "SMS screenshots, bank account statements showing transfer transaction reference txn-882713.",
      officerNotes: "Phishing site domain www.sbi-kyc-verification.com registered in Russia. Money traced to a mule account in Bihar.",
    });
    console.log(`   Case Metadata Upserted successfully.`);

    // 3. Run Investigation Summary RAG Generation
    console.log("📂 Step 3: Triggering Investigation Summary AI Generation...");
    const { document } = await documentGeneratorService.generateDocument(
      testCase.id,
      "cmr4p4vq30000hockjtrgqv3d",
      DocumentType.INVESTIGATION_SUMMARY,
      `test-req-${Date.now()}`
    );

    console.log("\n==================================================");
    console.log(`🎉 SUCCESS: Investigation Summary v${document.version} Generated!`);
    console.log(`Title: ${document.title}`);
    console.log("==================================================");
    
    const content = document.content as any;
    console.log(`Executive Summary:\n   ${content.executiveSummary}\n`);
    console.log(`Incident Overview:\n   ${content.incidentOverview}\n`);
    console.log(`Facts Established:\n   ${content.factsEstablished}\n`);
    console.log(`Applicable Offenses & Sections:`);
    content.applicableSections.forEach((sec: any) => {
      console.log(`  - Section: ${sec.section}`);
      console.log(`    Reason:  ${sec.reason}`);
    });
    console.log(`\nEvidence Assessment:\n   ${content.evidenceAssessment}\n`);
    console.log(`Persons Involved:\n   ${content.personsInvolved}\n`);
    console.log(`Findings:\n   ${content.investigationFindings}\n`);
    console.log(`Potential Gaps:\n   ${content.potentialGaps}\n`);
    console.log(`Next Steps:\n   ${content.recommendedNextSteps}\n`);
    console.log(`Conclusion:\n   ${content.conclusion}`);
    console.log("==================================================");

    // 4. Clean up test records to keep database pristine
    console.log("\n🧹 Step 4: Cleaning up database test records...");
    await prisma.case.delete({
      where: {
        id: testCase.id,
      },
    });
    console.log("   Pruned case dossier and cascaded metadata/documents.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Investigation Summary generation pipeline test failed:", error);
    process.exit(1);
  }
}

main();

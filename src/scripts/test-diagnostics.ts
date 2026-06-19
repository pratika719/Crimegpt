import { aiDiagnosticsChain } from "../ai/chains/ai-diagnostics.chain";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  const mockData = {
    narrative: "Yesterday evening at around 8:00 PM, while walking near the sector 15 market, " +
               "a man approached me and claimed he was a senior army officer. He wore a replica uniform " +
               "and demanded that I hand over my phone and wallet for security verification. " +
               "I trusted him because of the uniform, but he took my belongings and ran away in a red car.",
    metadata: {
      incidentDate: "2026-06-17",
      incidentTime: "20:00",
      incidentLocation: "Sector 15 Market",
      victimName: "John Doe",
    },
    persons: [
      { name: "John Doe", role: "VICTIM", statement: "The man was wearing a green uniform with stars. He had a scar on his left cheek." },
      { name: "Jane Smith", role: "WITNESS", statement: "I saw a man in a police-like uniform talking to John. He seemed middle-aged." }
    ],
    evidence: [
      { title: "CCTV Footage", type: "VIDEO", description: "Market entrance camera showing a red sedan speeding away at 8:15 PM." }
    ],
    checklist: [
      { title: "Record Victim Statement", completed: true },
      { title: "Identify Suspect", completed: false }
    ]
  };
  const mockContext: any = {
    caseId: "mock-case-id",
    title: "Mock Case Title",
    narrative: mockData.narrative,
    status: "OPEN",
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: mockData.metadata,
    investigationProfile: {
      firNumber: null,
      policeStation: null,
      investigatingOfficer: null,
      dateOfRegistration: null,
      incidentDateTime: new Date("2026-06-17T20:00:00"),
      incidentLocation: "Sector 15 Market",
      incidentDescription: mockData.narrative,
      investigationNotes: null,
    },
    persons: mockData.persons.map((p, idx) => ({
      id: `p-${idx}`,
      name: p.name,
      role: p.role,
      phone: null,
      address: null,
      statement: p.statement,
      notes: null,
      createdAt: new Date(),
    })),
    victims: mockData.persons
      .filter((p) => p.role === "VICTIM")
      .map((p, idx) => ({
        id: `v-${idx}`,
        personId: `p-${idx}`,
        name: p.name,
        phone: null,
        address: null,
        statement: p.statement,
        injuryDetails: null,
        status: "Stable",
      })),
    accused: mockData.persons
      .filter((p) => p.role === "SUSPECT")
      .map((p, idx) => ({
        id: `a-${idx}`,
        personId: `p-${idx}`,
        name: p.name,
        phone: null,
        address: null,
        statement: p.statement,
        arrestStatus: "Wanted",
        bailDetails: null,
      })),
    witnesses: mockData.persons
      .filter((p) => p.role === "WITNESS")
      .map((p, idx) => ({
        id: `w-${idx}`,
        personId: `p-${idx}`,
        name: p.name,
        phone: null,
        address: null,
        statement: p.statement,
        statementDate: new Date(),
        credibilityScore: "High",
      })),
    vehicles: [],
    seizedItems: [],
    medicalInfos: [],
    courtInfos: [],
    evidence: mockData.evidence.map((e, idx) => ({
      id: `e-${idx}`,
      title: e.title,
      description: e.description,
      type: e.type,
      notes: null,
      fileUrl: null,
    })),
    checklist: mockData.checklist.map((c, idx) => ({
      id: `c-${idx}`,
      title: c.title,
      completed: c.completed,
      completedAt: c.completed ? new Date() : null,
    })),
    documents: [],
    activities: [],
  };

  console.log(`🤖 [Test AI Diagnostics] Running diagnostics chain...`);
  
  try {
    const output = await aiDiagnosticsChain.execute(mockContext);

    console.log(`✅ Chain Executed Successfully in ${output.latencyMs}ms!`);
    console.log(`🤖 Model Used: ${output.modelUsed}`);
    console.log(`\n📄 AI Case Diagnostics:`);
    console.log(`==================================================`);
    console.log(`RISK LEVEL ASSESSMENT:`);
    console.log(`  Level:     ${output.result.riskLevel.level}`);
    console.log(`  Reasoning: ${output.result.riskLevel.reasoning}`);
    
    console.log(`\nMISSING INFORMATION:`);
    console.log(`  Items:     ${output.result.missingInformation.items.join(", ")}`);
    console.log(`  Reasoning: ${output.result.missingInformation.reasoning}`);
    
    console.log(`\nSUGGESTED NEXT STEPS:`);
    output.result.suggestedNextSteps.steps.forEach((r, i) => {
      console.log(`    - [${r.priority}] ${r.task}: ${r.reason}`);
    });
    console.log(`  Reasoning: ${output.result.suggestedNextSteps.reasoning}`);

    console.log(`\nAPPLICABLE LEGAL SECTIONS:`);
    output.result.applicableLegalSections.sections.forEach((s, i) => {
      console.log(`    - Section ${s.section} (${s.offense}): ${s.applicability}`);
    });
    console.log(`  Reasoning: ${output.result.applicableLegalSections.reasoning}`);

    console.log(`\nEVIDENCE COMPLETENESS:`);
    console.log(`  Score:      ${output.result.evidenceCompleteness.score}%`);
    console.log(`  Assessment: ${output.result.evidenceCompleteness.assessment}`);
    console.log(`  Gaps:       ${output.result.evidenceCompleteness.gaps.join(", ")}`);
    console.log(`  Reasoning:  ${output.result.evidenceCompleteness.reasoning}`);
    console.log(`==================================================`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Diagnostics test execution failed:", error);
    process.exit(1);
  }
}

main();

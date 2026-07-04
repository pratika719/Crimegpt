import { queueProducerService } from "@/services/queue/queue-producer.service";

async function main() {
  const result = await queueProducerService.addIngestionJob({
    sourceType: "EVIDENCE_TEXT",
    sourceId: "test-evidence-001",
    caseId: "test-case-001",
    userId: "test-user-001",
    text: `
      The complainant stated that the accused entered the shop at around 9 PM.
      The accused allegedly threatened the complainant and took cash from the counter.
      CCTV footage and witness statements are available for verification.
    `,
    metadata: {
      test: true,
      source: "smoke-test",
    },
  });

  console.log("Queued ingestion job:", result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Smoke test failed:", error);
    process.exit(1);
  });
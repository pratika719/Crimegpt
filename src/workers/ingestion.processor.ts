import type { Job } from "bullmq";
import type { IngestionJobPayload } from "@/lib/queue/job-types";
import { evidenceIngestionService } from "@/services/ingestion/evidence-ingestion.service";

export async function processIngestionJob(job: Job<IngestionJobPayload>) {
  console.log("[ingestion-worker] picked job", {
  id: job.id,
  name: job.name,
  data: job.data,
});
  
  await job.updateProgress({
    status: "STARTED",
    progress: 5,
    message: "Ingestion started.",
  });

  if (job.data.sourceType === "EVIDENCE_TEXT") {
    if (!job.data.caseId || !job.data.text) {
      throw new Error("EVIDENCE_TEXT ingestion requires caseId and text.");
    }

    await job.updateProgress({
      status: "CHUNKING",
      progress: 30,
      message: "Chunking evidence text.",
    });
console.log("[ingestion-worker] chunking evidence", {
  sourceId: job.data.sourceId,
  caseId: job.data.caseId,
  hasText: Boolean(job.data.text),
});
    const result = await evidenceIngestionService.ingestEvidenceText({
      evidenceId: job.data.sourceId,
      caseId: job.data.caseId,
      userId: job.data.userId,
      text: job.data.text,
    });

    console.log("[ingestion-worker] chunk count", result.chunksQueued);
    console.log("[ingestion-worker] queued embedding jobs");

    await job.updateProgress({
      status: "QUEUED_EMBEDDINGS",
      progress: 100,
      message: `Queued ${result.chunksQueued} embedding jobs.`,
    });

    return result;
  }
  throw new Error(`Unsupported ingestion source type: ${job.data.sourceType}`);
}
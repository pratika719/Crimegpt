import type { Job } from "bullmq";
import type { DocumentGenerationJobPayload } from "@/lib/queue/job-types";
import { setAITempState } from "@/lib/redis/ai-temp-state";
import { documentGeneratorService } from "@/services/document-engine/document-generator.service";

export async function processDocumentGenerationJob(
  job: Job<DocumentGenerationJobPayload>,
): Promise<{
  requestId: string;
  caseId: string;
  documentType: string;
  status: "COMPLETED";
}> {
  const { requestId, caseId, userId, documentType } = job.data;

  await job.updateProgress({
    status: "STARTED",
    progress: 5,
    message: "Document generation started.",
  });

  await setAITempState({
    requestId,
    caseId,
    status: "RUNNING",
    progress: 5,
    message: "Document generation started.",
    updatedAt: new Date().toISOString(),
    metadata: {
      documentType,
      jobId: job.id,
    },
  });

  await job.updateProgress({
    status: "BUILDING_CONTEXT",
    progress: 20,
    message: "Building case context.",
  });

  await setAITempState({
    requestId,
    caseId,
    status: "RETRIEVING_CONTEXT",
    progress: 20,
    message: "Building case context and retrieving laws.",
    updatedAt: new Date().toISOString(),
    metadata: {
      documentType,
      jobId: job.id,
    },
  });

  const result = await documentGeneratorService.generateDocument(
    caseId,
    userId,
    documentType,
  );

  await job.updateProgress({
    status: "SAVING",
    progress: 90,
    message: "Saving generated document.",
  });

  await setAITempState({
    requestId,
    caseId,
    status: "SAVING",
    progress: 90,
    message: "Saving generated document.",
    updatedAt: new Date().toISOString(),
    metadata: {
      documentType,
      jobId: job.id,
    },
  });

  await job.updateProgress({
    status: "COMPLETED",
    progress: 100,
    message: "Document generation completed.",
  });

  await setAITempState({
    requestId,
    caseId,
    status: "COMPLETED",
    progress: 100,
    message: "Document generation completed.",
    updatedAt: new Date().toISOString(),
    metadata: {
      documentType,
      jobId: job.id,
    },
  });

  return {
    requestId,
    caseId,
    documentType,
    status: "COMPLETED",
  };
}
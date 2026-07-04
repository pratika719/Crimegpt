import { evidenceChunkingService } from "@/services/evidence/evidence-chunking.service";
import { queueProducerService } from "@/services/queue/queue-producer.service";

export class EvidenceIngestionService {
  async ingestEvidenceText(input: {
    evidenceId: string;
    caseId: string;
    userId: string;
    text: string;
  }) {
    const chunks = evidenceChunkingService.chunkText({
      evidenceId: input.evidenceId,
      caseId: input.caseId,
      text: input.text,
    });

    const jobs = [];

    for (const chunk of chunks) {
      const job = await queueProducerService.addEmbeddingJob({
        sourceType: "EVIDENCE",
        sourceId: input.evidenceId,
        caseId: input.caseId,
        userId: input.userId,
        text: chunk.content,
        chunkIndex: chunk.chunkIndex,
        metadata: chunk.metadata,
      });

      jobs.push(job);
    }

    return {
      evidenceId: input.evidenceId,
      caseId: input.caseId,
      chunksQueued: jobs.length,
      jobs,
    };
  }
}

export const evidenceIngestionService = new EvidenceIngestionService();
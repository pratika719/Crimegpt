export type EvidenceTextChunk = {
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
};

export class EvidenceChunkingService {
  chunkText(input: {
    evidenceId: string;
    caseId: string;
    text: string;
    maxChunkSize?: number;
    overlapSize?: number;
  }): EvidenceTextChunk[] {
    const maxChunkSize = input.maxChunkSize ?? 1_500;
    const overlapSize = input.overlapSize ?? 200;

    const normalizedText = input.text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!normalizedText) {
      return [];
    }

    const chunks: EvidenceTextChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < normalizedText.length) {
      const end = Math.min(start + maxChunkSize, normalizedText.length);
      const content = normalizedText.slice(start, end).trim();

      if (content.length > 0) {
        chunks.push({
          chunkIndex,
          content,
          metadata: {
            evidenceId: input.evidenceId,
            caseId: input.caseId,
            chunkIndex,
            sourceType: "EVIDENCE",
          },
        });

        chunkIndex += 1;
      }

      if (end >= normalizedText.length) {
        break;
      }

      start = Math.max(0, end - overlapSize);
    }

    return chunks;
  }
}

export const evidenceChunkingService = new EvidenceChunkingService();
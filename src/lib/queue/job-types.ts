import type {
  AIRequestType,
  DocumentType,
  EvidenceType,
} from "@/generated/prisma/client";

export type BaseJobPayload = {
  requestId: string;
  userId: string;
  createdAt: string;
};

export type DocumentGenerationJobPayload = BaseJobPayload & {
  caseId: string;
  documentType: DocumentType;
  forceRegenerate?: boolean;
  inputHash?: string;
};

export type AIGenerationJobPayload = BaseJobPayload & {
  caseId: string;
  requestType: AIRequestType;
  inputHash?: string;
};


export type EmailJobPayload = BaseJobPayload & {
  to: string;
  subject: string;
  template: "AI_JOB_COMPLETED" | "AI_JOB_FAILED" | "CASE_REPORT_READY";
  data: Record<string, unknown>;
};

export type CleanupJobPayload = BaseJobPayload & {
  cleanupType:
    | "EXPIRED_AI_TEMP_STATE"
    | "OLD_FAILED_JOBS"
    | "STALE_LOCKS"
    | "OLD_AUDIT_LOGS";
  olderThanDays?: number;
};
export type EmbeddingSourceType = "LAW_CHUNK" | "EVIDENCE" | "CASE_DOCUMENT";

export type EmbeddingJobPayload = BaseJobPayload & {
  sourceType: EmbeddingSourceType;
  sourceId: string;
  caseId?: string;
  text: string;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
};

export type IngestionJobPayload = BaseJobPayload & {
  sourceType: "EVIDENCE_TEXT" | "EVIDENCE_FILE" | "LAW_CSV";
  sourceId: string;
  caseId?: string;
  text?: string;
  storageKey?: string;
  metadata?: Record<string, unknown>;
};
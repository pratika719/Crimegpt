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

export type EmbeddingJobPayload = BaseJobPayload & {
  sourceType: "LAW_CHUNK" | "EVIDENCE" | "CASE_DOCUMENT";
  sourceId: string;
  caseId?: string;
  text: string;
  chunkIndex?: number;
};

export type IngestionJobPayload = BaseJobPayload & {
  sourceType: "LAW_CSV" | "EVIDENCE_FILE" | "TEXT";
  sourceId: string;
  caseId?: string;
  evidenceType?: EvidenceType;
  storageKey?: string;
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
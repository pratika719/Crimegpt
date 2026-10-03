/**
 * Shared type definitions for document generation and management.
 */

export type ProgressCallback = (status: string, progress: number, message: string) => Promise<void>;

export interface GeneratedDocumentSummary {
  id: string;
  type: string;
  title: string;
  content: unknown;
  version: number;
  createdAt: Date;
}

export interface GenerateResult {
  document: GeneratedDocumentSummary;
  latencyMs: number;
  modelUsed: string;
  tokenUsage?: number;
  repaired: boolean;
}

export interface GenerateDocumentOptions {
  requestId?: string;
  onProgress?: ProgressCallback;
  forceRegenerate?: boolean;
}

export interface ValidatedAiOutput<T> {
  result: T;
  rawResponse: string;
  latencyMs: number;
  modelUsed: string;
  tokenUsage?: number;
  repaired: boolean;
}

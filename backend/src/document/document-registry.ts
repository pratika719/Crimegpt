import { z } from 'zod';
import type { CleanedLawReference } from '../ai/types/ai.types';
import type { UnifiedCaseContext } from '../case/services/unified-context.service';

// ---------------------------------------------------------------------------
// Document type enum — mirrors the Prisma enum
// ---------------------------------------------------------------------------

export enum DocumentType {
  FIR = 'FIR',
  INVESTIGATION_SUMMARY = 'INVESTIGATION_SUMMARY',
  CHARGE_SHEET = 'CHARGE_SHEET',
  REMAND_REQUEST = 'REMAND_REQUEST',
  CASE_DIARY = 'CASE_DIARY',
  LEGAL_ANALYSIS = 'LEGAL_ANALYSIS',
}

// ---------------------------------------------------------------------------
// DocumentConfig
// ---------------------------------------------------------------------------

export interface DocumentConfig<T = unknown> {
  type: DocumentType;
  titlePrefix: string;
  schema: z.ZodType<T>;
  requiresRAG: boolean;
  buildPrompt: (context: UnifiedCaseContext, retrievedChunks: CleanedLawReference[]) => string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class DocumentRegistry {
  private static readonly registry = new Map<DocumentType, DocumentConfig>();

  static register(config: DocumentConfig): void {
    DocumentRegistry.registry.set(config.type, config);
  }

  static getConfig(type: DocumentType): DocumentConfig {
    const config = DocumentRegistry.registry.get(type);
    if (!config) {
      throw new Error(`Document type ${type} is not registered in the DocumentRegistry.`);
    }
    return config;
  }

  static getRegisteredTypes(): DocumentType[] {
    return Array.from(DocumentRegistry.registry.keys());
  }
}

// ---------------------------------------------------------------------------
// Register all document types
// ---------------------------------------------------------------------------

// Lazy imports to avoid circular dependencies — schemas and prompts are pure
// and only imported when the registry is accessed.
/* eslint-disable @typescript-eslint/no-require-imports -- intentional require(): breaks the import cycle between the registry and its schema/prompt modules; a static import would circularly re-import this file at module load */
function loadRegistrations() {
  const { FIRSchema } = require('./schemas/fir.schema');
  const { InvestigationSummarySchema } = require('./schemas/investigation-summary.schema');
  const { ChargeSheetSchema } = require('./schemas/chargesheet.schema');
  const { RemandRequestSchema } = require('./schemas/remand-request.schema');
  const { CaseDiarySchema } = require('./schemas/case-diary.schema');
  const { buildFIRGenerationPrompt } = require('../ai/prompts/fir-generation.prompt');
  const { buildInvestigationSummaryPrompt } = require('../ai/prompts/investigation-summary.prompt');
  const { buildChargeSheetPrompt } = require('../ai/prompts/chargesheet-generation.prompt');
  const { buildRemandRequestPrompt } = require('../ai/prompts/remand-request-generation.prompt');
  const { buildCaseDiaryPrompt } = require('../ai/prompts/case-diary-generation.prompt');
  /* eslint-enable @typescript-eslint/no-require-imports -- see note above */

  DocumentRegistry.register({
    type: DocumentType.FIR,
    titlePrefix: 'First Information Report (FIR)',
    schema: FIRSchema,
    requiresRAG: true,
    buildPrompt: (ctx, chunks) => buildFIRGenerationPrompt(ctx, chunks),
  });

  DocumentRegistry.register({
    type: DocumentType.INVESTIGATION_SUMMARY,
    titlePrefix: 'Investigation Summary Report',
    schema: InvestigationSummarySchema,
    requiresRAG: true,
    buildPrompt: (ctx, chunks) => buildInvestigationSummaryPrompt(ctx, chunks),
  });

  DocumentRegistry.register({
    type: DocumentType.CHARGE_SHEET,
    titlePrefix: 'Charge Sheet (Final Report)',
    schema: ChargeSheetSchema,
    requiresRAG: true,
    buildPrompt: (ctx, chunks) => buildChargeSheetPrompt(ctx, chunks),
  });

  DocumentRegistry.register({
    type: DocumentType.REMAND_REQUEST,
    titlePrefix: 'Remand Request Application',
    schema: RemandRequestSchema,
    requiresRAG: false,
    buildPrompt: (ctx) => buildRemandRequestPrompt(ctx),
  });

  DocumentRegistry.register({
    type: DocumentType.CASE_DIARY,
    titlePrefix: 'Official Case Diary',
    schema: CaseDiarySchema,
    requiresRAG: false,
    buildPrompt: (ctx) => buildCaseDiaryPrompt(ctx),
  });
}

// Execute once at import time
loadRegistrations();

import { z } from "zod";
import { DocumentType, AIRequestType, ActivityType } from "@/generated/prisma/client";
import { UnifiedCaseContext } from "@/services/case/unified-context.service";
import { CleanedLawReference } from "@/ai/retrievers/law.retriever";

// Import schemas
import { FIRSchema } from "@/schema/fir.schema";
import { InvestigationSummarySchema } from "@/schema/investigation-summary.schema";
import { ChargeSheetSchema } from "@/schema/chargesheet.schema";
import { RemandRequestSchema } from "@/schema/remand-request.schema";
import { CaseDiarySchema } from "@/schema/case-diary.schema";

// Import prompts
import { buildFIRGenerationPrompt } from "@/ai/prompts/fir-generation.prompt";
import { buildInvestigationSummaryPrompt } from "@/ai/prompts/investigation-summary.prompt";
import { buildChargeSheetPrompt } from "@/ai/prompts/chargesheet-generation.prompt";
import { buildRemandRequestPrompt } from "@/ai/prompts/remand-request-generation.prompt";
import { buildCaseDiaryPrompt } from "@/ai/prompts/case-diary-generation.prompt";

export interface DocumentConfig<T = any> {
  type: DocumentType;
  titlePrefix: string;
  schema: z.ZodType<T>;
  aiRequestType: AIRequestType;
  requiresRAG: boolean;
  buildPrompt: (context: UnifiedCaseContext, retrievedChunks: CleanedLawReference[]) => string;
  activityGenerated: ActivityType;
  activityRegenerated: ActivityType;
  activityDownloaded: ActivityType;
}

export class DocumentRegistry {
  private static registry = new Map<DocumentType, DocumentConfig>();

  public static register(config: DocumentConfig) {
    this.registry.set(config.type, config);
  }

  public static getConfig(type: DocumentType): DocumentConfig {
    const config = this.registry.get(type);
    if (!config) {
      throw new Error(`Document type ${type} is not registered in the DocumentRegistry.`);
    }
    return config;
  }

  public static getRegisteredTypes(): DocumentType[] {
    return Array.from(this.registry.keys());
  }
}

// Register all documents
DocumentRegistry.register({
  type: DocumentType.FIR,
  titlePrefix: "First Information Report (FIR)",
  schema: FIRSchema,
  aiRequestType: AIRequestType.FIR_GENERATION,
  requiresRAG: true,
  buildPrompt: (context, chunks) => buildFIRGenerationPrompt(context, chunks),
  activityGenerated: ActivityType.FIR_GENERATED,
  activityRegenerated: ActivityType.DOCUMENT_REGENERATED,
  activityDownloaded: ActivityType.DOCUMENT_DOWNLOADED,
});

DocumentRegistry.register({
  type: DocumentType.INVESTIGATION_SUMMARY,
  titlePrefix: "Investigation Summary Report",
  schema: InvestigationSummarySchema,
  aiRequestType: AIRequestType.INVESTIGATION_SUMMARY,
  requiresRAG: false, // The prompt uses the context itself
  buildPrompt: (context, chunks) => buildInvestigationSummaryPrompt(context, chunks),
  activityGenerated: ActivityType.INVESTIGATION_SUMMARY_GENERATED,
  activityRegenerated: ActivityType.DOCUMENT_REGENERATED,
  activityDownloaded: ActivityType.DOCUMENT_DOWNLOADED,
});

DocumentRegistry.register({
  type: DocumentType.CHARGE_SHEET,
  titlePrefix: "Charge Sheet (Final Report)",
  schema: ChargeSheetSchema,
  aiRequestType: AIRequestType.CHARGE_SHEET,
  requiresRAG: true,
  buildPrompt: (context, chunks) => buildChargeSheetPrompt(context, chunks),
  activityGenerated: ActivityType.CHARGE_SHEET_GENERATED,
  activityRegenerated: ActivityType.DOCUMENT_REGENERATED,
  activityDownloaded: ActivityType.DOCUMENT_DOWNLOADED,
});

DocumentRegistry.register({
  type: DocumentType.REMAND_REQUEST,
  titlePrefix: "Remand Request Application",
  schema: RemandRequestSchema,
  aiRequestType: AIRequestType.REMAND_REQUEST_GENERATION,
  requiresRAG: false,
  buildPrompt: (context, _chunks) => buildRemandRequestPrompt(context),
  activityGenerated: ActivityType.REMAND_REQUEST_GENERATED,
  activityRegenerated: ActivityType.DOCUMENT_REGENERATED,
  activityDownloaded: ActivityType.DOCUMENT_DOWNLOADED,
});

DocumentRegistry.register({
  type: DocumentType.CASE_DIARY,
  titlePrefix: "Official Case Diary",
  schema: CaseDiarySchema,
  aiRequestType: AIRequestType.CASE_DIARY_GENERATION,
  requiresRAG: false,
  buildPrompt: (context, _chunks) => buildCaseDiaryPrompt(context),
  activityGenerated: ActivityType.CASE_DIARY_GENERATED,
  activityRegenerated: ActivityType.DOCUMENT_REGENERATED,
  activityDownloaded: ActivityType.DOCUMENT_DOWNLOADED,
});

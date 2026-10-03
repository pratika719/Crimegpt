import { Injectable, Logger } from '@nestjs/common';
import { LawRetrieverService } from '../ai/retrievers/law-retriever.service';
import { UnifiedContextService } from '../case/services/unified-context.service';
import { DocumentRegistry, DocumentType } from './document-registry';
import { DocumentLockService } from './services/document-lock.service';
import { DocumentValidatorService } from './services/document-validator.service';
import { DocumentAiService } from './services/document-ai.service';
import { DocumentPersistenceService } from './services/document-persistence.service';
import { DEFAULT_RAG_CHUNK_LIMIT } from './document.constants';
import type {
  ProgressCallback,
  GenerateResult,
  GenerateDocumentOptions,
} from './document.types';

// Re-export types for backward-compatibility with existing imports
export type { ProgressCallback, GenerateResult, GenerateDocumentOptions };

@Injectable()
export class DocumentGeneratorService {
  private readonly logger = new Logger(DocumentGeneratorService.name);

  constructor(
    private readonly lockService: DocumentLockService,
    private readonly validatorService: DocumentValidatorService,
    private readonly unifiedContext: UnifiedContextService,
    private readonly lawRetriever: LawRetrieverService,
    private readonly documentAi: DocumentAiService,
    private readonly persistence: DocumentPersistenceService,
  ) {}

  /**
   * The core unified AI document generation pipeline orchestrator.
   *
   * Coordinates:
   * 1. Distributed Redis locking (prevent concurrent generations for same case+type)
   * 2. Context aggregation & enrichment
   * 3. Fail-fast entity validation
   * 4. Legal RAG context retrieval
   * 5. AI model generation, schema validation & repair
   * 6. Transactional persistence & activity logging
   */
  async generateDocument(
    caseId: string,
    userId: string,
    type: DocumentType,
    opts?: GenerateDocumentOptions,
  ): Promise<GenerateResult> {
    return this.lockService.withLock(caseId, type, () =>
      this.executePipeline(caseId, userId, type, opts),
    );
  }

  private async executePipeline(
    caseId: string,
    userId: string,
    type: DocumentType,
    opts?: GenerateDocumentOptions,
  ): Promise<GenerateResult> {
    const onProgress = opts?.onProgress;
    const requestId = opts?.requestId;

    await onProgress?.('STARTED', 5, 'Document generation started.');

    // 1. Build and enrich case context
    const rawContext = await this.unifiedContext.buildUnifiedCaseContext(caseId, userId);
    const enrichedContext = this.validatorService.enrichContext(rawContext, type);

    await onProgress?.('BUILDING_CONTEXT', 20, 'Building case context.');

    // 2. Validate required entities (fail fast)
    this.validatorService.validateEntities(enrichedContext, type);

    // 3. Retrieve legal context via RAG if required
    const config = DocumentRegistry.getConfig(type);
    const retrievedChunks = await this.retrieveLegalChunks(
      config,
      enrichedContext,
      opts?.forceRegenerate,
      onProgress,
    );

    // 4. Build prompt and execute validated AI generation
    const promptText = config.buildPrompt(enrichedContext, retrievedChunks);

    await onProgress?.('GENERATING', 60, 'Generating document with AI model.');
    const aiOutput = await this.documentAi.generateValidated(promptText, config.schema, type);

    // 5. Persist document and log activity in an atomic transaction
    await onProgress?.('SAVING', 90, 'Saving generated document.');
    const savedDocument = await this.persistence.saveGeneratedDocument({
      caseId,
      userId,
      type,
      content: aiOutput.result,
      rawResponse: aiOutput.rawResponse,
      retrievedChunks,
      latencyMs: aiOutput.latencyMs,
      modelUsed: aiOutput.modelUsed,
      tokenUsage: aiOutput.tokenUsage,
      requestId,
    });

    await onProgress?.('COMPLETED', 100, 'Document generation completed.');

    return {
      document: savedDocument,
      latencyMs: aiOutput.latencyMs,
      modelUsed: aiOutput.modelUsed,
      tokenUsage: aiOutput.tokenUsage,
      repaired: aiOutput.repaired,
    };
  }

  private async retrieveLegalChunks(
    config: ReturnType<typeof DocumentRegistry.getConfig>,
    enrichedContext: any,
    forceRegenerate?: boolean,
    onProgress?: ProgressCallback,
  ): Promise<Awaited<ReturnType<LawRetrieverService['retrieve']>>> {
    if (!config.requiresRAG) {
      return [];
    }

    await onProgress?.('RETRIEVING_CONTEXT', 30, 'Retrieving legal context...');

    const queryParts = [
      enrichedContext.title,
      enrichedContext.narrative,
      enrichedContext.investigationProfile?.incidentDescription,
    ].filter(Boolean);
    const ragQuery = queryParts.join('\n\n').trim();

    let chunks: Awaited<ReturnType<LawRetrieverService['retrieve']>> = [];
    try {
      chunks = await this.lawRetriever.retrieve(ragQuery, DEFAULT_RAG_CHUNK_LIMIT, {
        bypassCache: Boolean(forceRegenerate),
      });
      this.logger.log(`Retrieved ${chunks.length} law sections`);
    } catch (ragErr) {
      this.logger.warn({ err: ragErr }, 'RAG retrieval failed — continuing without legal context');
    }

    await onProgress?.('RETRIEVING_CONTEXT', 40, 'Retrieved legal context, building prompt.');
    return chunks;
  }
}

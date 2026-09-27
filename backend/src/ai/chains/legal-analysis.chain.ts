import { Injectable, Logger } from '@nestjs/common';
import type { ChainOutput } from '../types/ai.types';
import type { UnifiedCaseContext } from '../../case/services/unified-context.service';
import { LawRetrieverService } from '../retrievers/law-retriever.service';
import { GeminiService } from '../providers/gemini.provider';
import { PromptService } from '../prompts/prompts.service';

/** Zod-like validation for the legal analysis output. */
function validateLegalAnalysisResult(data: unknown): ChainOutput['result'] {
  const obj = data as Record<string, unknown>;

  if (typeof obj.summary !== 'string' || obj.summary.length === 0) {
    throw new Error('Invalid legal analysis: summary is required');
  }
  if (!Array.isArray(obj.applicableSections)) {
    throw new Error('Invalid legal analysis: applicableSections must be an array');
  }
  if (typeof obj.reasoning !== 'string' || obj.reasoning.length === 0) {
    throw new Error('Invalid legal analysis: reasoning is required');
  }
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(obj.confidence as string)) {
    throw new Error('Invalid legal analysis: confidence must be HIGH, MEDIUM, or LOW');
  }

  return {
    summary: obj.summary as string,
    applicableSections: obj.applicableSections as Array<{ section: string; reason: string }>,
    reasoning: obj.reasoning as string,
    confidence: obj.confidence as 'HIGH' | 'MEDIUM' | 'LOW',
  };
}

@Injectable()
export class LegalAnalysisChainService {
  private readonly logger = new Logger(LegalAnalysisChainService.name);

  constructor(
    private readonly lawRetriever: LawRetrieverService,
    private readonly gemini: GeminiService,
    private readonly promptService: PromptService,
  ) {}

  /**
   * Execute the full RAG pipeline for legal analysis.
   */
  async execute(
    context: UnifiedCaseContext,
    k = 5,
    opts?: { bypassCache?: boolean },
  ): Promise<ChainOutput> {
    const startTime = Date.now();
    this.logger.log('Initiating legal analysis chain');

    // 1. Retrieve law sections from PGVector
    const retrievedChunks = await this.lawRetriever.retrieve(context.narrative, k, opts);
    this.logger.log(`Retrieved ${retrievedChunks.length} legal context chunks`);

    // 2. Build the prompt
    const promptText = this.promptService.buildLegalAnalysis(context, retrievedChunks);

    // 3. Query Gemini
    const modelUsed = this.gemini.getModelName();
    this.logger.log(`Dispatching RAG prompt to ${modelUsed}`);

    const { text: rawResponse } = await this.gemini.generateJSON(promptText);

    const latencyMs = Date.now() - startTime;
    this.logger.log(`Model responded in ${latencyMs}ms`);

    // 4. Validate the output
    const parsed = JSON.parse(rawResponse);
    const result = validateLegalAnalysisResult(parsed);
    this.logger.log('Legal analysis result validated');

    return { result, modelUsed, latencyMs, promptText, rawResponse, retrievedChunks };
  }
}

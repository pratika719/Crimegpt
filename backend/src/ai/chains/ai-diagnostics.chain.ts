import { Injectable, Logger } from '@nestjs/common';
import type { DiagnosticsChainOutput } from '../types/ai.types';
import type { UnifiedCaseContext } from '../../case/services/unified-context.service';
import { LawRetrieverService } from '../retrievers/law-retriever.service';
import { GeminiService } from '../providers/gemini.provider';
import { PromptService } from '../prompts/prompts.service';

/** Validate the AI diagnostics output shape. */
function validateAIDiagnosticsResult(data: unknown): DiagnosticsChainOutput['result'] {
  const obj = data as Record<string, unknown>;

  const requireObj = (key: string, fields: string[]) => {
    const val = obj[key] as Record<string, unknown> | undefined;
    if (!val || typeof val !== 'object') throw new Error(`Invalid diagnostics: ${key} is required`);
    for (const f of fields) {
      if (!(f in val)) throw new Error(`Invalid diagnostics: ${key}.${f} is required`);
    }
    return val;
  };

  const riskLevel = requireObj('riskLevel', ['level', 'reasoning']);
  const missingInformation = requireObj('missingInformation', ['items', 'reasoning']);
  const suggestedNextSteps = requireObj('suggestedNextSteps', ['steps', 'reasoning']);
  const applicableLegalSections = requireObj('applicableLegalSections', ['sections', 'reasoning']);
  const evidenceCompleteness = requireObj('evidenceCompleteness', ['score', 'assessment', 'gaps', 'reasoning']);

  return {
    riskLevel: {
      level: riskLevel.level as 'HIGH' | 'MEDIUM' | 'LOW',
      reasoning: riskLevel.reasoning as string,
    },
    missingInformation: {
      items: missingInformation.items as string[],
      reasoning: missingInformation.reasoning as string,
    },
    suggestedNextSteps: {
      steps: (suggestedNextSteps.steps as Array<Record<string, unknown>>).map((s) => ({
        task: s.task as string,
        priority: s.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        reason: s.reason as string,
      })),
      reasoning: suggestedNextSteps.reasoning as string,
    },
    applicableLegalSections: {
      sections: (applicableLegalSections.sections as Array<Record<string, unknown>>).map((s) => ({
        section: s.section as string,
        offense: s.offense as string,
        applicability: s.applicability as string,
      })),
      reasoning: applicableLegalSections.reasoning as string,
    },
    evidenceCompleteness: {
      score: Number(evidenceCompleteness.score),
      assessment: evidenceCompleteness.assessment as string,
      gaps: evidenceCompleteness.gaps as string[],
      reasoning: evidenceCompleteness.reasoning as string,
    },
  };
}

@Injectable()
export class AIDiagnosticsChainService {
  private readonly logger = new Logger(AIDiagnosticsChainService.name);

  constructor(
    private readonly lawRetriever: LawRetrieverService,
    private readonly gemini: GeminiService,
    private readonly promptService: PromptService,
  ) {}

  async execute(
    context: UnifiedCaseContext,
    k = 5,
    opts?: { bypassCache?: boolean },
  ): Promise<DiagnosticsChainOutput> {
    const startTime = Date.now();
    this.logger.log('Initiating AI diagnostics chain');

    // 1. Retrieve law sections
    const retrievedChunks = await this.lawRetriever.retrieve(context.narrative, k, opts);
    this.logger.log(`Retrieved ${retrievedChunks.length} legal context chunks`);

    // 2. Build the prompt
    const promptText = this.promptService.buildAIDiagnostics(context, retrievedChunks);

    // 3. Query Gemini
    const modelUsed = this.gemini.getModelName();
    this.logger.log(`Dispatching diagnostics prompt to ${modelUsed}`);

    const { text: rawResponse } = await this.gemini.generateJSON(promptText);

    const latencyMs = Date.now() - startTime;
    this.logger.log(`Model responded in ${latencyMs}ms`);

    // 4. Validate
    const parsed = JSON.parse(rawResponse);
    const result = validateAIDiagnosticsResult(parsed);
    this.logger.log('Diagnostics result validated');

    return { result, modelUsed, latencyMs, promptText, rawResponse, retrievedChunks };
  }
}

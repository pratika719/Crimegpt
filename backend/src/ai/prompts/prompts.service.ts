import { Injectable } from '@nestjs/common';
import type { CleanedLawReference } from '../types/ai.types';
import type { UnifiedCaseContext } from '../../case/services/unified-context.service';
import { buildFIRGenerationPrompt } from './fir-generation.prompt';
import { buildChargeSheetPrompt } from './chargesheet-generation.prompt';
import { buildInvestigationSummaryPrompt } from './investigation-summary.prompt';
import { buildCaseDiaryPrompt } from './case-diary-generation.prompt';
import { buildRemandRequestPrompt } from './remand-request-generation.prompt';
import { buildLegalAnalysisPrompt } from './legal-analysis.prompt';
import { buildAIDiagnosticsPrompt } from './ai-diagnostics.prompt';

/**
 * Thin facade that wraps the pure prompt-builder functions so they can be
 * injected via NestJS DI.  The builders themselves remain pure — no side effects.
 */
@Injectable()
export class PromptService {
  buildFIR(ctx: UnifiedCaseContext, laws: CleanedLawReference[]): string {
    return buildFIRGenerationPrompt(ctx, laws);
  }

  buildChargeSheet(ctx: UnifiedCaseContext, laws: CleanedLawReference[]): string {
    return buildChargeSheetPrompt(ctx, laws);
  }

  buildInvestigationSummary(ctx: UnifiedCaseContext, laws: CleanedLawReference[]): string {
    return buildInvestigationSummaryPrompt(ctx, laws);
  }

  buildCaseDiary(ctx: UnifiedCaseContext): string {
    return buildCaseDiaryPrompt(ctx);
  }

  buildRemandRequest(ctx: UnifiedCaseContext): string {
    return buildRemandRequestPrompt(ctx);
  }

  buildLegalAnalysis(ctx: UnifiedCaseContext, laws: CleanedLawReference[]): string {
    return buildLegalAnalysisPrompt(ctx, laws);
  }

  buildAIDiagnostics(ctx: UnifiedCaseContext, laws: CleanedLawReference[]): string {
    return buildAIDiagnosticsPrompt(ctx, laws);
  }
}

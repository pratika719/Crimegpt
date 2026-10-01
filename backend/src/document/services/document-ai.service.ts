import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../../ai/providers/gemini.provider';
import { PROMPT_SECURITY_INSTRUCTIONS } from '../../ai/constants/ai.constants';
import { DocumentType } from '../document-registry';
import type { ValidatedAiOutput } from '../document.types';
import { z, ZodError } from 'zod';

@Injectable()
export class DocumentAiService {
  private readonly logger = new Logger(DocumentAiService.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generates AI output from a prompt, validates against a Zod schema,
   * and optionally performs a single bounded repair attempt if validation fails.
   */
  async generateValidated<T>(
    promptText: string,
    schema: z.ZodType<T>,
    type: DocumentType,
  ): Promise<ValidatedAiOutput<T>> {
    const totalStart = Date.now();
    const repairEnabled = this.config.get<string>('DOCGEN_REPAIR_RETRY') !== 'false';

    // First attempt — apply system instruction defense
    const initial = await this.gemini.generateJSON(promptText, {
      systemInstruction: PROMPT_SECURITY_INSTRUCTIONS,
    });

    const firstAttempt = this.parseAndValidate(schema, initial.text);
    if (firstAttempt.ok) {
      return {
        result: firstAttempt.result,
        rawResponse: initial.text,
        latencyMs: Date.now() - totalStart,
        modelUsed: this.gemini.getModelName(),
        tokenUsage: initial.tokenUsage,
        repaired: false,
      };
    }

    // Single bounded repair attempt
    if (repairEnabled) {
      const repairPrompt = this.buildRepairPrompt(promptText, initial.text, firstAttempt.issues);
      this.logger.warn(
        { documentType: type, issueCount: firstAttempt.issues.length },
        'Attempting to repair AI output',
      );

      try {
        const repaired = await this.gemini.generateJSON(repairPrompt, {
          systemInstruction: PROMPT_SECURITY_INSTRUCTIONS,
        });
        const repairedAttempt = this.parseAndValidate(schema, repaired.text);
        if (repairedAttempt.ok) {
          return {
            result: repairedAttempt.result,
            rawResponse: repaired.text,
            latencyMs: Date.now() - totalStart,
            modelUsed: this.gemini.getModelName(),
            tokenUsage: repaired.tokenUsage,
            repaired: true,
          };
        }
      } catch {
        this.logger.warn('Repair attempt errored — falling back to original failure');
      }
    }

    throw new Error(`Document generation failed for ${type}: ${firstAttempt.error?.message}`);
  }

  private parseAndValidate<T>(
    schema: z.ZodType<T>,
    text: string,
  ):
    | { ok: true; result: T; error: null; issues: [] }
    | { ok: false; result: null; error: Error; issues: unknown[] } {
    try {
      const rawData = JSON.parse(text);
      const result = schema.parse(rawData);
      return { ok: true, result, error: null, issues: [] };
    } catch (error: unknown) {
      const issues = error instanceof ZodError ? error.issues : [];
      return { ok: false, result: null, error: error as Error, issues };
    }
  }

  private buildRepairPrompt(originalPrompt: string, rawResponse: string, issues: unknown[]): string {
    const issueSummary = issues
      .map((i: any) => `- ${i.path?.join('.')}: ${i.message}`)
      .join('\n');

    return `${originalPrompt}

The previous response failed validation with these issues:
${issueSummary}

Previous response:
${rawResponse}

Please fix the validation issues and return a single valid JSON object matching the expected schema. Do not wrap in markdown code blocks.`;
  }
}

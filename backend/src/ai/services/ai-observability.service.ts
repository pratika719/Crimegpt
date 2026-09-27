import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OBSERVABILITY_PROMPT_MAX_CHARS, OBSERVABILITY_RESPONSE_MAX_CHARS } from '../constants/ai.constants';
import type { AIRequestType } from '@/generated/prisma/client';

/**
 * Records AI request telemetry in the AIRequestLog table.
 *
 * This is fire-and-forget — telemetry failure must never abort the calling
 * operation.
 */
@Injectable()
export class AiObservabilityService {
  private readonly logger = new Logger(AiObservabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logRequest(
    userId: string,
    data: {
      requestType: AIRequestType;
      prompt: string;
      retrievedContext?: string;
      response: string;
      latencyMs?: number;
      modelUsed?: string;
      tokenUsage?: number;
      caseId?: string;
      queueJobId?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.aIRequestLog.create({
        data: {
          userId,
          caseId: data.caseId,
          requestType: data.requestType,
          prompt: data.prompt.substring(0, OBSERVABILITY_PROMPT_MAX_CHARS),
          retrievedContext: data.retrievedContext,
          response: data.response.substring(0, OBSERVABILITY_RESPONSE_MAX_CHARS),
          latencyMs: data.latencyMs,
          modelUsed: data.modelUsed,
          tokenUsage: data.tokenUsage,
        },
      });
    } catch (err) {
      this.logger.warn({ err }, 'Failed to write AI observability log — non-fatal');
    }
  }
}

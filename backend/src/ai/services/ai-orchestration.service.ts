import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LegalAnalysisChainService } from '../chains/legal-analysis.chain';
import { AIDiagnosticsChainService } from '../chains/ai-diagnostics.chain';
import { UnifiedContextService } from '../../case/services/unified-context.service';
import { ActivityService } from '../../case/services/activity.service';
import { AiObservabilityService } from './ai-observability.service';
import { DocumentType, CaseStatus, AIRequestType } from '@prisma/client';

@Injectable()
export class AiOrchestrationService {
  private readonly logger = new Logger(AiOrchestrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly legalAnalysisChain: LegalAnalysisChainService,
    private readonly aiDiagnosticsChain: AIDiagnosticsChainService,
    private readonly unifiedContext: UnifiedContextService,
    private readonly activityService: ActivityService,
    private readonly observability: AiObservabilityService,
  ) {}

  async runLegalAnalysis(caseId: string, userId: string) {
    this.logger.log({ caseId, userId }, 'Starting legal analysis');

    const caseItem = await this.prisma.case.findFirst({ where: { id: caseId, userId } });
    if (!caseItem) throw new NotFoundException('Case not found');

    const context = await this.unifiedContext.buildUnifiedCaseContext(caseId, userId);
    const chainOutput = await this.legalAnalysisChain.execute(context);

    // Save document atomically
    const document = await this.prisma.$transaction(async (tx) => {
      const existingDocs = await tx.generatedDocument.findMany({
        where: { caseId, type: DocumentType.LEGAL_ANALYSIS },
      });
      const nextVer = existingDocs.length > 0
        ? Math.max(...existingDocs.map((d) => d.version)) + 1
        : 1;

      if (existingDocs.length > 0) {
        await tx.generatedDocument.deleteMany({
          where: { caseId, type: DocumentType.LEGAL_ANALYSIS },
        });
      }

      const doc = await tx.generatedDocument.create({
        data: {
          caseId,
          type: DocumentType.LEGAL_ANALYSIS,
          title: 'Legal Analysis',
          content: chainOutput.result as any,
          version: nextVer,
        },
      });

      await tx.case.update({
        where: { id: caseId },
        data: { status: CaseStatus.UNDER_INVESTIGATION },
      });

      return doc;
    });

    await this.observability.logRequest(userId, {
      requestType: AIRequestType.LEGAL_ANALYSIS,
      prompt: chainOutput.promptText,
      retrievedContext: JSON.stringify(chainOutput.retrievedChunks),
      response: chainOutput.rawResponse,
      latencyMs: chainOutput.latencyMs,
      modelUsed: chainOutput.modelUsed,
      caseId,
    });

    await this.activityService.logDocumentGenerated(
      caseId,
      userId,
      'LEGAL_ANALYSIS',
      'Legal Analysis',
      document.version,
    );

    return document;
  }

  async runDiagnostics(caseId: string, userId: string) {
    this.logger.log({ caseId, userId }, 'Running AI diagnostics');

    const caseItem = await this.prisma.case.findFirst({ where: { id: caseId, userId } });
    if (!caseItem) throw new NotFoundException('Case not found');

    const context = await this.unifiedContext.buildUnifiedCaseContext(caseId, userId);
    const chainOutput = await this.aiDiagnosticsChain.execute(context);

    await this.observability.logRequest(userId, {
      requestType: AIRequestType.AI_DIAGNOSTICS_GENERATION,
      prompt: chainOutput.promptText,
      retrievedContext: JSON.stringify(chainOutput.retrievedChunks),
      response: chainOutput.rawResponse,
      latencyMs: chainOutput.latencyMs,
      modelUsed: chainOutput.modelUsed,
      caseId,
    });

    return chainOutput.result;
  }
}

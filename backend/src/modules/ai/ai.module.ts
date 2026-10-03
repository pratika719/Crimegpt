import { Module } from '@nestjs/common';
import { GeminiService } from './providers/gemini.provider';
import { LawRetrieverService } from './retrievers/law-retriever.service';
import { LegalAnalysisChainService } from './chains/legal-analysis.chain';
import { AIDiagnosticsChainService } from './chains/ai-diagnostics.chain';
import { PromptService } from './prompts/prompts.service';
import { AiObservabilityService } from './services/ai-observability.service';
import { AiOrchestrationService } from './services/ai-orchestration.service';
import { AIController } from './controllers/ai.controller';
import { VectorModule } from './vector/vector.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { PrismaModule, CacheModule } from '@/common';
import { CaseModule } from '../case/case.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    EmbeddingModule,
    VectorModule,
    CaseModule,
  ],
  controllers: [AIController],
  providers: [
    GeminiService,
    LawRetrieverService,
    LegalAnalysisChainService,
    AIDiagnosticsChainService,
    PromptService,
    AiObservabilityService,
    AiOrchestrationService,
  ],
  exports: [
    GeminiService,
    VectorModule,
    LawRetrieverService,
    LegalAnalysisChainService,
    AIDiagnosticsChainService,
    PromptService,
    AiObservabilityService,
    AiOrchestrationService,
  ],
})
export class AIModule {}

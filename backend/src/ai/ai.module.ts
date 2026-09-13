import { Module, forwardRef } from '@nestjs/common';
import { GeminiService } from './providers/gemini.provider';
import { VectorStoreService } from './vector/pgvector.service';
import { LawRetrieverService } from './retrievers/law-retriever.service';
import { LegalAnalysisChainService } from './chains/legal-analysis.chain';
import { AIDiagnosticsChainService } from './chains/ai-diagnostics.chain';
import { PromptService } from './prompts/prompts.service';
import { AiObservabilityService } from './services/ai-observability.service';
import { AiOrchestrationService } from './services/ai-orchestration.service';
import { AIController } from './controllers/ai.controller';
import { VectorModule } from './vector/vector.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { CaseModule } from '../case/case.module';
import { DocumentModule } from '../document/document.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    EmbeddingModule,
    VectorModule,
    CaseModule,
    forwardRef(() => DocumentModule),
  ],
  controllers: [AIController],
  providers: [
    GeminiService,
    VectorStoreService,
    LawRetrieverService,
    LegalAnalysisChainService,
    AIDiagnosticsChainService,
    PromptService,
    AiObservabilityService,
    AiOrchestrationService,
  ],
  exports: [
    GeminiService,
    VectorStoreService,
    LawRetrieverService,
    LegalAnalysisChainService,
    AIDiagnosticsChainService,
    PromptService,
    AiObservabilityService,
    AiOrchestrationService,
  ],
})
export class AIModule {}

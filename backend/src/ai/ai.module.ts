import { Module } from '@nestjs/common';
import { GeminiService } from './providers/gemini.provider';
import { VectorStoreService } from './vector/pgvector.service';
import { LawRetrieverService } from './retrievers/law-retriever.service';
import { LegalAnalysisChainService } from './chains/legal-analysis.chain';
import { AIDiagnosticsChainService } from './chains/ai-diagnostics.chain';
import { PromptService } from './prompts/prompts.service';
import { AiObservabilityService } from './services/ai-observability.service';
import { VectorModule } from './vector/vector.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule, EmbeddingModule, VectorModule],
  providers: [
    GeminiService,
    VectorStoreService,
    LawRetrieverService,
    LegalAnalysisChainService,
    AIDiagnosticsChainService,
    PromptService,
    AiObservabilityService,
  ],
  exports: [
    GeminiService,
    VectorStoreService,
    LawRetrieverService,
    LegalAnalysisChainService,
    AIDiagnosticsChainService,
    PromptService,
    AiObservabilityService,
  ],
})
export class AIModule {}

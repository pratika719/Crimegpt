import { Module } from '@nestjs/common';
import { PrismaModule, CacheModule } from '@/common';
import { QueueModule } from '../queue/queue.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorModule } from '../ai/vector/vector.module';
import { CaseModule } from '../case/case.module';

import { EvidenceRepository } from './repositories/evidence.repository';
import { EvidenceService } from './services/evidence.service';
import { EvidenceEmbeddingService } from './services/evidence-embedding.service';
import { EvidenceIngestionService } from './services/evidence-ingestion.service';
import { EvidenceController } from './controllers/evidence.controller';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    QueueModule,
    EmbeddingModule,
    VectorModule,
    CaseModule,
  ],
  controllers: [EvidenceController],
  providers: [
    EvidenceRepository,
    EvidenceService,
    EvidenceEmbeddingService,
    EvidenceIngestionService,
  ],
  exports: [
    EvidenceRepository,
    EvidenceService,
    EvidenceEmbeddingService,
    EvidenceIngestionService,
  ],
})
export class EvidenceModule {}

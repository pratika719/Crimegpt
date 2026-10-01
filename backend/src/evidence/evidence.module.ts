import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorModule } from '../ai/vector/vector.module';
import { CaseModule } from '../case/case.module';

import { EvidenceRepository } from '../case/repositories/evidence.repository';
import { EvidenceService } from '../case/services/evidence.service';
import { EvidenceEmbeddingService } from '../case/services/evidence-embedding.service';
import { EvidenceIngestionService } from '../case/services/evidence-ingestion.service';
import { EvidenceController } from '../case/controllers/evidence.controller';

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

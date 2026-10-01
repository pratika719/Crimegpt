/**
 * Worker Module — wires all processors and worker services.
 *
 * This module is separate from QueueModule to maintain separation of concerns:
 * - QueueModule: queue management (adding jobs, checking status)
 * - WorkerModule: job processing (executing jobs)
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { RedisModule } from '../redis/redis.module';
import { AIModule } from '../ai/ai.module';
import { CaseModule } from '../case/case.module';
import { DocumentModule } from '../document/document.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { QueueModule } from './queue.module';

// Processors
import { DocumentGenerationProcessor } from './processors/document-generation.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { IngestionProcessor } from './processors/ingestion.processor';

// Services
import { JobStatusService } from './services/job-status.service';
import { AiTempStateService } from './services/ai-temp-state.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { ProgressTracker } from './services/progress-tracker.service';
import { ErrorClassifier } from './errors/error-classifier';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    RedisModule,
    AIModule,
    CaseModule,
    DocumentModule,
    EvidenceModule,
    EmbeddingModule,
    QueueModule, // Provides BullModule with registered queues
  ],
  providers: [
    // Shared services
    AiTempStateService,
    CacheInvalidationService,
    ProgressTracker,
    ErrorClassifier,

    // Processors (EvidenceEmbeddingService & EvidenceIngestionService injected via EvidenceModule)
    DocumentGenerationProcessor,
    EmbeddingProcessor,
    IngestionProcessor,
  ],
  exports: [
    JobStatusService,
    AiTempStateService,
  ],
})
export class WorkerModule {}

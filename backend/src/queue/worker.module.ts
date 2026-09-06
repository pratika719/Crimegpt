/**
 * Worker Module — wires all processors and worker services.
 *
 * This module is separate from QueueModule to maintain separation of concerns:
 * - QueueModule: queue management (adding jobs, checking status)
 * - WorkerModule: job processing (executing jobs)
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { RedisModule } from '../redis/redis.module';
import { AIModule } from '../ai/ai.module';
import { CaseModule } from '../case/case.module';
import { DocumentModule } from '../document/document.module';
import { QueueModule } from './queue.module';

// Processors
import { DocumentGenerationProcessor } from './processors/document-generation.processor';
import { AIGenerationProcessor } from './processors/ai-generation.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { IngestionProcessor } from './processors/ingestion.processor';
import { EmailProcessor } from './processors/email.processor';
import { CleanupProcessor } from './processors/cleanup.processor';

// Services
import { JobStatusService } from './services/job-status.service';
import { AiTempStateService } from './services/ai-temp-state.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { ProgressTracker } from './services/progress-tracker.service';
import { ErrorClassifier } from './errors/error-classifier';

// Domain services needed by processors
import { EvidenceEmbeddingService } from '../case/services/evidence-embedding.service';
import { EvidenceIngestionService } from '../case/services/evidence-ingestion.service';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    RedisModule,
    AIModule,
    CaseModule,
    DocumentModule,
    QueueModule, // Provides BullModule with registered queues
  ],
  providers: [
    // Shared services
    JobStatusService,
    AiTempStateService,
    CacheInvalidationService,
    ProgressTracker,
    ErrorClassifier,

    // Domain services needed by processors
    EvidenceEmbeddingService,
    EvidenceIngestionService,

    // Processors
    DocumentGenerationProcessor,
    AIGenerationProcessor,
    EmbeddingProcessor,
    IngestionProcessor,
    EmailProcessor,
    CleanupProcessor,
  ],
  exports: [
    JobStatusService,
    AiTempStateService,
  ],
})
export class WorkerModule {}

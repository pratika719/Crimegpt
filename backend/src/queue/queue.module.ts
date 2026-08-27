import { Module } from '@nestjs/common';

/**
 * QueueModule — BullMQ job queues and processors.
 *
 * Phase 6 will populate this module with:
 * - BullModule.forRoot() with Redis connection
 * - DocumentGenerationProcessor
 * - AIGenerationProcessor
 * - EmbeddingProcessor
 * - IngestionProcessor
 * - EmailProcessor
 * - CleanupProcessor
 * - QueueProducerService
 */
@Module({})
export class QueueModule {}

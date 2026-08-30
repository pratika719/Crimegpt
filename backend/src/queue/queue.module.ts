import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queue-names';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.DOCUMENT_GENERATION },
      { name: QUEUE_NAMES.AI_GENERATION },
      { name: QUEUE_NAMES.EMBEDDING },
      { name: QUEUE_NAMES.INGESTION },
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.CLEANUP },
    ),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}

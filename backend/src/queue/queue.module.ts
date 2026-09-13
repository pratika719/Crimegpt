import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queue-names';

function getRedisConnectionOptions(configService?: ConfigService) {
  const redisUrl = configService?.get<string>('REDIS_URL') || process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
        maxRetriesPerRequest: null,
      };
    } catch {
      // Fallback if URL parsing fails
    }
  }
  return {
    host: configService?.get<string>('REDIS_HOST') || process.env.REDIS_HOST || 'localhost',
    port: parseInt(configService?.get<string>('REDIS_PORT') || process.env.REDIS_PORT || '6379', 10),
    password: configService?.get<string>('REDIS_PASSWORD') || process.env.REDIS_PASSWORD,
    tls: (configService?.get<string>('REDIS_URL') || process.env.REDIS_URL)?.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: getRedisConnectionOptions(configService),
      }),
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

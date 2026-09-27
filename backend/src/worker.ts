import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import http from 'http';

// Infrastructure
import { LoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { CacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { WorkerModule } from './queue/worker.module';

// Domain Modules
import { HealthModule } from './health/health.module';
import { CaseModule } from './case/case.module';
import { DocumentModule } from './document/document.module';
import { EvidenceModule } from './evidence/evidence.module';
import { SearchModule } from './search/search.module';
import { AuditModule } from './audit/audit.module';
import { AIModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { EmbeddingModule } from './embedding/embedding.module';

/**
 * Dedicated root module for the background worker process.
 * Unconditionally boots WorkerModule and all BullMQ processors.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    LoggerModule,
    PrismaModule,
    RedisModule,
    CacheModule,
    QueueModule,
    WorkerModule,
    HealthModule,
    CaseModule,
    DocumentModule,
    EvidenceModule,
    SearchModule,
    AuditModule,
    AIModule,
    AuthModule,
    EmbeddingModule,
  ],
})
export class WorkerAppModule {}

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');

  logger.log('Starting CrimeGPT Standalone Background Worker...');

  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.enableShutdownHooks();

  logger.log('CrimeGPT Background Worker initialized and listening for BullMQ queue jobs.');

  // Create lightweight HTTP server for Render health checks and keep-alive pings ($PORT)
  const port = process.env.PORT || 10000;
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/' || req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'crimegpt-worker',
          timestamp: new Date().toISOString(),
        }),
      );
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });

  server.listen(Number(port), '0.0.0.0', () => {
    logger.log(`Worker health check endpoint listening on http://0.0.0.0:${port}/health`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error starting CrimeGPT worker:', err);
  process.exit(1);
});

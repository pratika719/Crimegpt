import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Infrastructure
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { CacheModule } from './cache/cache.module';

// Health
import { HealthModule } from './health/health.module';

// Common
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Domain (skeleton — populated in Phase 3-7)
import { CaseModule } from './case/case.module';
import { DocumentModule } from './document/document.module';
import { EvidenceModule } from './evidence/evidence.module';
import { SearchModule } from './search/search.module';
import { AuditModule } from './audit/audit.module';
import { AIModule } from './ai/ai.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { EmbeddingModule } from './embedding/embedding.module';

@Module({
  imports: [
    // Config — loads .env globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Infrastructure
    PrismaModule,
    RedisModule,
    CacheModule,

    // Health
    HealthModule,

    // Domain (skeleton modules)
    CaseModule,
    DocumentModule,
    EvidenceModule,
    SearchModule,
    AuditModule,
    AIModule,
    QueueModule,
    AuthModule,
    EmbeddingModule,
  ],
  providers: [
    // Global exception filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // Global response transform
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },

    // Global request logging
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Add middleware here as needed (e.g., CORS, rate limiting)
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

// Infrastructure
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { CacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { WorkerModule } from './queue/worker.module';

// Health
import { HealthModule } from './health/health.module';

// Common
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PromptSecurityInterceptor } from './common/interceptors/prompt-security.interceptor';
import { RateLimitGuard } from './common/guards/throttler.guard';
import { LoggerModule } from './common/logger/logger.module';

// Domain (skeleton — populated in Phase 3-7)
import { CaseModule } from './case/case.module';
import { DocumentModule } from './document/document.module';
import { EvidenceModule } from './evidence/evidence.module';
import { SearchModule } from './search/search.module';
import { AuditModule } from './audit/audit.module';
import { AIModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { EmbeddingModule } from './embedding/embedding.module';

@Module({
  imports: [
    // Config — loads .env globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Logger
    LoggerModule,

    // Rate limiting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000, // 1 minute
          limit: 60,   // 60 requests per minute
        },
      ],
    }),

    // Infrastructure
    PrismaModule,
    RedisModule,
    CacheModule,
    QueueModule,
    WorkerModule,

    // Health
    HealthModule,

    // Domain (skeleton modules)
    CaseModule,
    DocumentModule,
    EvidenceModule,
    SearchModule,
    AuditModule,
    AIModule,
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

    // Prompt-injection screening for request bodies (defense-in-depth;
    // systemInstruction-side mitigation lives in PROMPT_SECURITY_INSTRUCTIONS)
    { provide: APP_INTERCEPTOR, useClass: PromptSecurityInterceptor },

    // Global rate limiting
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {
  // No middleware consumer — cookieParser is applied in main.ts.
}

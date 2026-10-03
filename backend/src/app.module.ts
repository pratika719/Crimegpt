import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

// Common Infrastructure
import { ConfigModule } from './common/config';
import { RedisModule } from './common/redis';
import { PrismaModule } from './common/prisma';
import { CacheModule } from './common/cache';
import { LoggerModule } from './common/logger/logger.module';

// Operational & Infrastructure Modules
import { QueueModule } from './modules/queue/queue.module';
import { WorkerModule } from './modules/queue/worker.module';
import { HealthModule } from './modules/health/health.module';

// Common Interceptors, Filters, Guards
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PromptSecurityInterceptor } from './common/interceptors/prompt-security.interceptor';
import { RateLimitGuard } from './common/guards/throttler.guard';

// Bounded Domain Modules
import { CaseModule } from './modules/case/case.module';
import { DocumentModule } from './modules/document/document.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { SearchModule } from './modules/search/search.module';
import { AuditModule } from './modules/audit/audit.module';
import { AIModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';

@Module({
  imports: [
    // Config — loads .env globally with validation
    ConfigModule.forRoot(),

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
    // In production, workers run in a dedicated process (worker.ts).
    // In development, workers run with the main process for convenience unless ENABLE_WORKER=false.
    ...(process.env.NODE_ENV === 'production'
      ? process.env.ENABLE_WORKER === 'true' ? [WorkerModule] : []
      : process.env.ENABLE_WORKER !== 'false' && !process.env.VERCEL ? [WorkerModule] : []),

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

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../queue/queue.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private redis: RedisService,
    private queueService: QueueService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe — is the app running?' })
  check() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — are dependencies reachable?' })
  ready() {
    return this.health.check([
      () => this.prismaCheck(),
      () => this.redisCheck(),
      () => this.envCheck(),
    ]);
  }

  @Get('deep')
  @HealthCheck()
  @ApiOperation({ summary: 'Deep health — full dependency status' })
  deep() {
    return this.health.check([
      () => this.prismaCheck(),
      () => this.redisCheck(),
      () => this.envCheck(),
      () => this.embeddingProviderCheck(),
      () => this.geminiCheck(),
    ]);
  }

  private async prismaCheck(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { database: { status: 'up' } };
    } catch (error) {
      return {
        database: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private async redisCheck(): Promise<HealthIndicatorResult> {
    const status = await this.redis.ping();
    return {
      redis: {
        status: status === 'ok' ? 'up' : 'down',
      },
    };
  }

  private envCheck(): HealthIndicatorResult {
    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'GEMINI_API_KEY',
      'EMBEDDING_SERVICE_URL',
    ];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      return {
        env: {
          status: 'down',
          message: `Missing: ${missing.join(', ')}`,
        },
      };
    }
    return { env: { status: 'up' } };
  }

  private embeddingProviderCheck(): HealthIndicatorResult {
    const provider = process.env.EMBEDDING_PROVIDER;
    if (provider !== 'fastapi') {
      return {
        embeddingProvider: {
          status: 'down',
          message: `Expected fastapi, got ${provider ?? 'undefined'}`,
        },
      };
    }
    return { embeddingProvider: { status: 'up' } };
  }

  private geminiCheck(): HealthIndicatorResult {
    if (!process.env.GEMINI_API_KEY) {
      return {
        gemini: {
          status: 'down',
          message: 'GEMINI_API_KEY not configured',
        },
      };
    }
    return { gemini: { status: 'up' } };
  }
}

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
  HealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private redis: RedisService,
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
    ]);
  }

  @Get('deep')
  @HealthCheck()
  @ApiOperation({ summary: 'Deep health — full dependency status' })
  deep() {
    return this.health.check([
      () => this.prismaCheck(),
      () => this.redisCheck(),
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
}

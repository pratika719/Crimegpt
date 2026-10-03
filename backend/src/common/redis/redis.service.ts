import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  async onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('REDIS_URL not set — Redis features disabled');
      return;
    }

    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      enableReadyCheck: false,
      lazyConnect: true,
      tls: url.startsWith('rediss://') ? {} : undefined,
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    try {
      await this.client.connect();
      this.logger.log('Redis connected');
    } catch (err: unknown) {
      this.logger.warn(`Redis initial connection skipped: ${(err as Error)?.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis disconnected');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<'ok' | 'error'> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG' ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }
}

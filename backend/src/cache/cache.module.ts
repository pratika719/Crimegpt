import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheKeysService } from './cache-keys.service';

@Global()
@Module({
  providers: [CacheService, CacheKeysService],
  exports: [CacheService, CacheKeysService],
})
export class CacheModule {}

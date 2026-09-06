import { Module } from '@nestjs/common';
import { FastapiEmbeddingService } from './fastapi-embedding.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [FastapiEmbeddingService],
  exports: [FastapiEmbeddingService],
})
export class EmbeddingModule {}

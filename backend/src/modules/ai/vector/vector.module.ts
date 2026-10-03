import { Module } from '@nestjs/common';
import { VectorStoreService } from './pgvector.service';
import { EmbeddingModule } from '../../embedding/embedding.module';

@Module({
  imports: [EmbeddingModule],
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorModule {}

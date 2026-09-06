import { Module } from '@nestjs/common';
import { DocumentGeneratorService } from './document-generator.service';
import { AIModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CaseModule } from '../case/case.module';

@Module({
  imports: [PrismaModule, RedisModule, AIModule, CaseModule],
  providers: [DocumentGeneratorService],
  exports: [DocumentGeneratorService],
})
export class DocumentModule {}

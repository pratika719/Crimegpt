import { Module } from '@nestjs/common';
import { DocumentGeneratorService } from './document-generator.service';
import { DocumentLockService } from './services/document-lock.service';
import { DocumentValidatorService } from './services/document-validator.service';
import { DocumentAiService } from './services/document-ai.service';
import { DocumentPersistenceService } from './services/document-persistence.service';
import { DocumentCrudService } from '../case/services/document-crud.service';
import { DocumentRepository } from '../case/repositories/document.repository';
import { DocumentsController } from '../case/controllers/documents.controller';
import { AiDocumentController } from './ai-document.controller';
import { AIModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { QueueModule } from '../queue/queue.module';
import { CaseModule } from '../case/case.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    QueueModule,
    CaseModule,
    AIModule,
  ],
  controllers: [
    DocumentsController,
    AiDocumentController,
  ],
  providers: [
    DocumentGeneratorService,
    DocumentLockService,
    DocumentValidatorService,
    DocumentAiService,
    DocumentPersistenceService,
    DocumentCrudService,
    DocumentRepository,
  ],
  exports: [
    DocumentGeneratorService,
    DocumentLockService,
    DocumentValidatorService,
    DocumentAiService,
    DocumentPersistenceService,
    DocumentCrudService,
    DocumentRepository,
  ],
})
export class DocumentModule {}

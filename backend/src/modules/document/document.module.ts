import { Module } from '@nestjs/common';
import { PrismaModule, RedisModule } from '@/common';
import { QueueModule } from '../queue/queue.module';
import { CaseModule } from '../case/case.module';
import { AIModule } from '../ai/ai.module';

import { DocumentGeneratorService } from './document-generator.service';
import { DocumentLockService } from './services/document-lock.service';
import { DocumentValidatorService } from './services/document-validator.service';
import { DocumentAiService } from './services/document-ai.service';
import { DocumentPersistenceService } from './services/document-persistence.service';
import { DocumentCrudService } from './services/document-crud.service';
import { DocumentRepository } from './repositories/document.repository';
import { DocumentsController } from './controllers/documents.controller';
import { AiDocumentController } from './ai-document.controller';

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

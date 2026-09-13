import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../prisma/prisma.module';

// Repositories
import { CaseRepository } from './repositories/case.repository';
import { CaseActivityRepository } from './repositories/case-activity.repository';
import { PersonRepository } from './repositories/person.repository';
import { EvidenceRepository } from './repositories/evidence.repository';
import { ChecklistRepository } from './repositories/checklist.repository';
import { CaseMetadataRepository } from './repositories/case-metadata.repository';
import { DocumentRepository } from './repositories/document.repository';
import { InvestigationProfileRepository } from './repositories/investigation-profile.repository';

// Services
import { ActivityService } from './services/activity.service';
import { CaseService } from './services/case.service';
import { PersonService } from './services/person.service';
import { EvidenceService } from './services/evidence.service';
import { ChecklistService } from './services/checklist.service';
import { CaseMetadataService } from './services/case-metadata.service';
import { UnifiedContextService } from './services/unified-context.service';
import { DocumentCrudService } from './services/document-crud.service';
import { InvestigationProfileService } from './services/investigation-profile.service';

// Controllers
import { CasesController } from './controllers/cases.controller';
import { PersonsController } from './controllers/persons.controller';
import { EvidenceController } from './controllers/evidence.controller';
import { DocumentsController } from './controllers/documents.controller';
import { JobsController } from './controllers/jobs.controller';
import { ChecklistController } from './controllers/checklist.controller';
import { CaseMetadataController } from './controllers/case-metadata.controller';
import { TimelineController } from './controllers/timeline.controller';
import { InvestigationProfileController } from './controllers/investigation-profile.controller';

@Module({
  imports: [PrismaModule, CacheModule, QueueModule],
  controllers: [
    CasesController,
    PersonsController,
    EvidenceController,
    DocumentsController,
    JobsController,
    ChecklistController,
    CaseMetadataController,
    TimelineController,
    InvestigationProfileController,
  ],
  providers: [
    // Repositories
    CaseRepository,
    CaseActivityRepository,
    PersonRepository,
    EvidenceRepository,
    ChecklistRepository,
    CaseMetadataRepository,
    DocumentRepository,
    InvestigationProfileRepository,

    // Services
    ActivityService,
    CaseService,
    PersonService,
    EvidenceService,
    ChecklistService,
    CaseMetadataService,
    UnifiedContextService,
    DocumentCrudService,
    InvestigationProfileService,
  ],
  exports: [
    // Export services for use in other modules
    ActivityService,
    CaseService,
    PersonService,
    EvidenceService,
    ChecklistService,
    CaseMetadataService,
    UnifiedContextService,
    DocumentCrudService,
    InvestigationProfileService,
    CaseRepository,
    DocumentRepository,
  ],
})
export class CaseModule {}

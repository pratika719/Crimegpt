import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';

// Repositories
import { CaseRepository } from './repositories/case.repository';
import { CaseActivityRepository } from './repositories/case-activity.repository';
import { PersonRepository } from './repositories/person.repository';
import { EvidenceRepository } from './repositories/evidence.repository';
import { ChecklistRepository } from './repositories/checklist.repository';
import { CaseMetadataRepository } from './repositories/case-metadata.repository';

// Services
import { ActivityService } from './services/activity.service';
import { CaseService } from './services/case.service';
import { PersonService } from './services/person.service';
import { EvidenceService } from './services/evidence.service';
import { ChecklistService } from './services/checklist.service';
import { CaseMetadataService } from './services/case-metadata.service';

// Controllers
import { CasesController } from './controllers/cases.controller';
import { PersonsController } from './controllers/persons.controller';
import { EvidenceController } from './controllers/evidence.controller';
import { DocumentsController } from './controllers/documents.controller';
import { JobsController } from './controllers/jobs.controller';

@Module({
  imports: [CacheModule, QueueModule],
  controllers: [
    CasesController,
    PersonsController,
    EvidenceController,
    DocumentsController,
    JobsController,
  ],
  providers: [
    // Repositories
    CaseRepository,
    CaseActivityRepository,
    PersonRepository,
    EvidenceRepository,
    ChecklistRepository,
    CaseMetadataRepository,

    // Services
    ActivityService,
    CaseService,
    PersonService,
    EvidenceService,
    ChecklistService,
    CaseMetadataService,
  ],
  exports: [
    // Export services for use in other modules
    ActivityService,
    CaseService,
    PersonService,
    EvidenceService,
    ChecklistService,
    CaseMetadataService,
  ],
})
export class CaseModule {}

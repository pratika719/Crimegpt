import { Module } from '@nestjs/common';
import { CacheModule, PrismaModule } from '@/common';
import { QueueModule } from '../queue/queue.module';

// Repositories
import { CaseRepository } from './repositories/case.repository';
import { CaseActivityRepository } from './repositories/case-activity.repository';
import { PersonRepository } from './repositories/person.repository';
import { ChecklistRepository } from './repositories/checklist.repository';
import { CaseMetadataRepository } from './repositories/case-metadata.repository';
import { InvestigationProfileRepository } from './repositories/investigation-profile.repository';

// Services
import { ActivityService } from './services/activity.service';
import { CaseService } from './services/case.service';
import { PersonService } from './services/person.service';
import { ChecklistService } from './services/checklist.service';
import { CaseMetadataService } from './services/case-metadata.service';
import { UnifiedContextService } from './services/unified-context.service';
import { InvestigationProfileService } from './services/investigation-profile.service';

// Controllers
import { CasesController } from './controllers/cases.controller';
import { PersonsController } from './controllers/persons.controller';
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
    ChecklistRepository,
    CaseMetadataRepository,
    InvestigationProfileRepository,

    // Services
    ActivityService,
    CaseService,
    PersonService,
    ChecklistService,
    CaseMetadataService,
    UnifiedContextService,
    InvestigationProfileService,
  ],
  exports: [
    ActivityService,
    CaseService,
    PersonService,
    ChecklistService,
    CaseMetadataService,
    UnifiedContextService,
    InvestigationProfileService,
    CaseRepository,
  ],
})
export class CaseModule {}

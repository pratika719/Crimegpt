import {
  Controller,
  Get,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { QueueService } from '@/modules/queue/queue.service';
import { JobStatusService } from '@/modules/queue/services/job-status.service';
import { CaseService } from '../services/case.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly jobStatusService: JobStatusService,
    private readonly caseService: CaseService,
  ) {}

  @Get('case/:caseId')
  @ApiOperation({ summary: 'Get active and recently failed jobs for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Active and failed jobs for the case' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async getCaseJobs(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.caseService.getCaseById(caseId, userId);
    return this.jobStatusService.getCaseJobs(caseId);
  }

  @Get(':queueName/:jobId')
  @ApiOperation({ summary: 'Get job status by queue name and job ID' })
  @ApiParam({ name: 'queueName', description: 'Queue name' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job status' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    this.logger.log(
      { queueName, jobId, userId },
      'Job status lookup',
    );
    return this.queueService.getJobStatus(queueName, jobId);
  }
}

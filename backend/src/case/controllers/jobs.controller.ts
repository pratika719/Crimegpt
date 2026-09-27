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
import { QueueService } from '../../queue/queue.service';
import { CaseService } from '../services/case.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly caseService: CaseService,
    private readonly prisma: PrismaService,
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

    const activeCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const activeJobs = await this.prisma.jobStatus.findMany({
      where: {
        caseId,
        status: { in: ['pending', 'active'] },
        updatedAt: { gte: activeCutoff },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        queueName: true,
        documentType: true,
        status: true,
        updatedAt: true,
      },
    });

    const failedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedJobs = await this.prisma.jobStatus.findMany({
      where: {
        caseId,
        status: 'failed',
        updatedAt: { gte: failedCutoff },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        queueName: true,
        documentType: true,
        errorMessage: true,
        errorCode: true,
        failureType: true,
        updatedAt: true,
      },
    });

    return {
      activeJobs,
      failedJobs,
    };
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

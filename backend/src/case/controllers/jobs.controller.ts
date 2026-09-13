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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly queueService: QueueService) {}

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

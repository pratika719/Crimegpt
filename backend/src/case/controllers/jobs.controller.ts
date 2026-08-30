import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
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
    try {
      // TODO: Implement actual job status lookup from PostgreSQL JobStatus table
      // For now, return a placeholder response
      this.logger.log({
        queueName,
        jobId,
        userId,
      }, 'Job status lookup');

      return {
        queueName,
        jobId,
        status: 'unknown',
        message: 'Job status lookup not yet implemented',
      };
    } catch (error) {
      this.logger.error({
        err: error,
        queueName,
        jobId,
        userId,
      }, 'Job status lookup failed');
      throw new NotFoundException('Job not found');
    }
  }
}

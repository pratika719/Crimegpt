import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ActivityService } from '../services/activity.service';
import { DocumentCrudService } from '../services/document-crud.service';
import { GenerateDocumentDto } from '../dto/generate-document.dto';
import { LogDocumentActivityDto } from '../dto/log-document-activity.dto';
import { RenameDocumentDto } from '../dto/rename-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CaseService } from '../services/case.service';
import { QueueService } from '../../queue/queue.service';
import { QUEUE_NAMES } from '../../queue/queue-names';
import crypto from 'node:crypto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly caseService: CaseService,
    private readonly activityService: ActivityService,
    private readonly documentCrudService: DocumentCrudService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all generated documents for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.caseService.getCaseById(caseId, userId);
    return this.documentCrudService.getDocuments(caseId, userId);
  }

  @Post()
  @Throttle({ default: { ttl: 600_000, limit: 5 } }) // 5 document generations per 10 minutes per user
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Generate a document for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 202, description: 'Document generation started' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generate(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateDocumentDto,
  ) {
    // Verify case exists and user has access
    await this.caseService.getCaseById(caseId, userId);

    const requestId = crypto.randomUUID();

    const job = await this.queueService.addJob(QUEUE_NAMES.DOCUMENT_GENERATION, {
      requestId,
      userId,
      caseId,
      documentType: dto.documentType,
      forceRegenerate: dto.forceRegenerate,
      createdAt: new Date().toISOString(),
    });

    this.logger.log({
      caseId,
      userId,
      jobId: job.id,
      documentType: dto.documentType,
      forceRegenerate: dto.forceRegenerate,
    }, 'Document generation queued');

    return {
      message: 'Document generation queued.',
      caseId,
      documentType: dto.documentType,
      status: 'queued',
      jobId: job.id,
      queueName: QUEUE_NAMES.DOCUMENT_GENERATION,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a generated document' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document renamed' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async rename(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RenameDocumentDto,
  ) {
    await this.caseService.getCaseById(caseId, userId);
    return this.documentCrudService.renameDocument(id, userId, dto.title.trim(), caseId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a generated document' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.caseService.getCaseById(caseId, userId);
    return this.documentCrudService.deleteDocument(id, userId, caseId);
  }

  @Post('activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log document activity (download, regenerate)' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Activity logged' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logActivity(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: LogDocumentActivityDto,
  ) {
    // Verify case exists and user has access
    await this.caseService.getCaseById(caseId, userId);

    if (dto.actionType === 'DOWNLOAD') {
      await this.activityService.logDocumentDownloaded(
        caseId,
        userId,
        dto.docType,
        dto.docTitle,
        dto.version,
      );
    } else if (dto.actionType === 'REGENERATE') {
      await this.activityService.logDocumentRegenerated(
        caseId,
        userId,
        dto.docType,
        dto.docTitle,
        dto.version,
      );
    }

    return { success: true };
  }
}

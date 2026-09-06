import {
  Controller,
  Post,
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
import { GenerateDocumentDto } from '../dto/generate-document.dto';
import { LogDocumentActivityDto } from '../dto/log-document-activity.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CaseService } from '../services/case.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly caseService: CaseService,
    private readonly activityService: ActivityService,
  ) {}

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

    // TODO: Queue document generation job (Phase 6)
    // For now, return a placeholder response
    this.logger.log({
      caseId,
      userId,
      documentType: dto.documentType,
      forceRegenerate: dto.forceRegenerate,
    }, 'Document generation requested');

    return {
      message: 'Document generation queued.',
      caseId,
      documentType: dto.documentType,
      status: 'queued',
    };
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

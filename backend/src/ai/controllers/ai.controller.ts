import {
  Controller,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AiOrchestrationService } from '../services/ai-orchestration.service';
import { DocumentGeneratorService } from '../../document/document-generator.service';
import { DocumentType } from '../../document/document-registry';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/ai')
export class AIController {
  constructor(
    private readonly aiService: AiOrchestrationService,
    @Inject(forwardRef(() => DocumentGeneratorService))
    private readonly documentGenerator: DocumentGeneratorService,
  ) {}

  @Post('legal-analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run AI legal analysis on case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Legal analysis generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async legalAnalysis(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.runLegalAnalysis(caseId, userId);
  }

  @Post('diagnostics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run AI diagnostics on case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Diagnostics completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async diagnostics(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.runDiagnostics(caseId, userId);
  }

  @Post('investigation-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI investigation summary document' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Investigation summary generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async investigationSummary(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.documentGenerator.generateDocument(
      caseId,
      userId,
      DocumentType.INVESTIGATION_SUMMARY,
    );
    return result.document;
  }
}

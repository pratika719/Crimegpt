import {
  Controller,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AiOrchestrationService } from '../services/ai-orchestration.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/ai')
export class AIController {
  constructor(
    private readonly aiService: AiOrchestrationService,
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
}

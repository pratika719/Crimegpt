import {
  Controller,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DocumentGeneratorService } from './document-generator.service';
import { DocumentType } from './document-registry';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/ai')
export class AiDocumentController {
  constructor(
    private readonly documentGenerator: DocumentGeneratorService,
  ) {}

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

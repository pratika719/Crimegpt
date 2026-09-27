import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CaseMetadataService } from '../services/case-metadata.service';
import { CaseService } from '../services/case.service';
import { UpdateCaseMetadataDto } from '../dto/case-metadata.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('case-metadata')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/metadata')
export class CaseMetadataController {
  constructor(
    private readonly metadataService: CaseMetadataService,
    private readonly caseService: CaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get case metadata by case ID' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case metadata' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Verify ownership
    await this.caseService.getCaseById(caseId, userId);
    return this.metadataService.getMetadataByCaseId(caseId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert / update case metadata' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case metadata updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCaseMetadataDto,
  ) {
    // Verify ownership
    await this.caseService.getCaseById(caseId, userId);

    return this.metadataService.updateMetadata(caseId, userId, {
      ...dto,
      incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : undefined,
    });
  }
}

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EvidenceService } from '../services/evidence.service';
import { CreateEvidenceDto } from '../dto/create-evidence.dto';
import { UpdateEvidenceDto } from '../dto/update-evidence.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('evidence')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add evidence to a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 201, description: 'Evidence added successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEvidenceDto,
  ) {
    return this.evidenceService.createEvidence(caseId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all evidence in a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'List of evidence' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.evidenceService.getEvidenceByCaseId(caseId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evidence by ID' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  @ApiResponse({ status: 200, description: 'Evidence details' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.evidenceService.getEvidenceById(id, userId, caseId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update evidence details' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  @ApiResponse({ status: 200, description: 'Evidence updated successfully' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateEvidenceDto,
  ) {
    return this.evidenceService.updateEvidence(id, userId, dto, caseId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove evidence from case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  @ApiResponse({ status: 200, description: 'Evidence removed successfully' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.evidenceService.deleteEvidence(id, userId, caseId);
  }
}

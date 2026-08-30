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
import { CaseService } from '../services/case.service';
import { CreateCaseDto } from '../dto/create-case.dto';
import { UpdateCaseDto } from '../dto/update-case.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('cases')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases')
export class CasesController {
  constructor(private readonly caseService: CaseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new case' })
  @ApiResponse({ status: 201, description: 'Case created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCaseDto,
  ) {
    return this.caseService.createCase(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cases for current user' })
  @ApiResponse({ status: 200, description: 'List of cases' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser('id') userId: string) {
    return this.caseService.getCases(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case by ID' })
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case details' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.caseService.getCaseById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update case' })
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case updated successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCaseDto,
  ) {
    return this.caseService.updateCase(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete case' })
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case deleted successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.caseService.deleteCase(id, userId);
  }
}

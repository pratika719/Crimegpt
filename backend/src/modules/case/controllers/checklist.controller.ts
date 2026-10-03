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
import { ChecklistService } from '../services/checklist.service';
import { CreateChecklistDto, UpdateChecklistDto } from '../dto/checklist.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';

@ApiTags('checklist')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/checklist')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get()
  @ApiOperation({ summary: 'Get all checklist items for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'List of checklist items' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.checklistService.getChecklistByCaseId(caseId, userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new checklist item for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 201, description: 'Checklist item created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.checklistService.createChecklistItem(caseId, userId, dto.title.trim());
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update or toggle a checklist item' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Checklist Item ID' })
  @ApiResponse({ status: 200, description: 'Checklist item updated' })
  @ApiResponse({ status: 404, description: 'Checklist item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.checklistService.updateChecklistItem(
      id,
      userId,
      {
        title: dto.title?.trim(),
        completed: dto.completed,
      },
      caseId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a checklist item' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Checklist Item ID' })
  @ApiResponse({ status: 200, description: 'Checklist item deleted' })
  @ApiResponse({ status: 404, description: 'Checklist item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.checklistService.deleteChecklistItem(id, userId, caseId);
  }
}

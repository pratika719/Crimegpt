import {
  Controller,
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
import { ActivityService } from '../services/activity.service';
import { UpdateTimelineEventDto } from '../dto/timeline.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('timeline')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/timeline')
export class TimelineController {
  constructor(private readonly activityService: ActivityService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update a timeline event description' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Timeline Event ID' })
  @ApiResponse({ status: 200, description: 'Timeline event updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTimelineEventDto,
  ) {
    return this.activityService.updateTimelineEvent(id, caseId, userId, dto.description);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a timeline event' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Timeline Event ID' })
  @ApiResponse({ status: 200, description: 'Timeline event deleted' })
  @ApiResponse({ status: 404, description: 'Timeline event not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.activityService.deleteTimelineEvent(id, caseId, userId);
  }
}

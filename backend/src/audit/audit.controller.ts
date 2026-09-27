import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get filtered and paginated audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAuditLogs(
    @CurrentUser('id') userId: string,
    @Query() filters: AuditFilterDto,
  ) {
    return this.auditService.getAuditLogs(userId, filters);
  }

  @Get('cases')
  @ApiOperation({ summary: 'Get cases list for audit dropdown filter' })
  @ApiResponse({ status: 200, description: 'Cases list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCasesForFilter(@CurrentUser('id') userId: string) {
    const cases = await this.auditService.getCasesForFilter(userId);
    return { cases };
  }
}

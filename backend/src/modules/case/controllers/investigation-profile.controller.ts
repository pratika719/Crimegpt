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
import { InvestigationProfileService } from '../services/investigation-profile.service';
import {
  UpsertInvestigationProfileDto,
  CreateVictimDto,
  UpdateVictimDto,
  CreateAccusedDto,
  UpdateAccusedDto,
  CreateWitnessDto,
  UpdateWitnessDto,
  CreateVehicleDto,
  UpdateVehicleDto,
  CreateSeizedItemDto,
  UpdateSeizedItemDto,
  CreateMedicalInfoDto,
  UpdateMedicalInfoDto,
  CreateCourtInfoDto,
  UpdateCourtInfoDto,
} from '../dto/investigation-profile.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';

@ApiTags('investigation-profile')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/profile')
export class InvestigationProfileController {
  constructor(private readonly profileService: InvestigationProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get investigation profile for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Investigation profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.getProfile(caseId, userId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert investigation profile' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Profile upserted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  upsertProfile(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertInvestigationProfileDto,
  ) {
    return this.profileService.upsertProfile(caseId, userId, {
      ...dto,
      dateOfRegistration: dto.dateOfRegistration ? new Date(dto.dateOfRegistration) : null,
      incidentDateTime: dto.incidentDateTime ? new Date(dto.incidentDateTime) : null,
    });
  }

  // --- Victims ---
  @Post('victims')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add victim to investigation' })
  addVictim(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVictimDto,
  ) {
    return this.profileService.addVictim(caseId, userId, dto);
  }

  @Patch('victims/:id')
  @ApiOperation({ summary: 'Update victim record' })
  updateVictim(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVictimDto,
  ) {
    return this.profileService.updateVictim(id, userId, dto);
  }

  @Delete('victims/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete victim record' })
  deleteVictim(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.deleteVictim(id, userId);
  }

  // --- Accused ---
  @Post('accused')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add accused to investigation' })
  addAccused(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAccusedDto,
  ) {
    return this.profileService.addAccused(caseId, userId, dto);
  }

  @Patch('accused/:id')
  @ApiOperation({ summary: 'Update accused record' })
  updateAccused(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAccusedDto,
  ) {
    return this.profileService.updateAccused(id, userId, dto);
  }

  @Delete('accused/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete accused record' })
  deleteAccused(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.deleteAccused(id, userId);
  }

  // --- Witnesses ---
  @Post('witnesses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add witness to investigation' })
  addWitness(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWitnessDto,
  ) {
    return this.profileService.addWitness(caseId, userId, {
      ...dto,
      statementDate: dto.statementDate ? new Date(dto.statementDate) : null,
    });
  }

  @Patch('witnesses/:id')
  @ApiOperation({ summary: 'Update witness record' })
  updateWitness(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWitnessDto,
  ) {
    return this.profileService.updateWitness(id, userId, {
      ...dto,
      statementDate: dto.statementDate ? new Date(dto.statementDate) : undefined,
    });
  }

  @Delete('witnesses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete witness record' })
  deleteWitness(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.deleteWitness(id, userId);
  }

  // --- Vehicles ---
  @Post('vehicles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add vehicle to investigation' })
  addVehicle(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.profileService.addVehicle(caseId, userId, dto);
  }

  @Patch('vehicles/:id')
  @ApiOperation({ summary: 'Update vehicle record' })
  updateVehicle(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.profileService.updateVehicle(id, userId, dto);
  }

  @Delete('vehicles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete vehicle record' })
  deleteVehicle(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.deleteVehicle(id, userId);
  }

  // --- Seized Items ---
  @Post('seized-items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add seized item to investigation' })
  addSeizedItem(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSeizedItemDto,
  ) {
    return this.profileService.addSeizedItem(caseId, userId, {
      ...dto,
      seizureDate: dto.seizureDate ? new Date(dto.seizureDate) : null,
    });
  }

  @Patch('seized-items/:id')
  @ApiOperation({ summary: 'Update seized item record' })
  updateSeizedItem(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSeizedItemDto,
  ) {
    return this.profileService.updateSeizedItem(id, userId, {
      ...dto,
      seizureDate: dto.seizureDate ? new Date(dto.seizureDate) : undefined,
    });
  }

  @Delete('seized-items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete seized item record' })
  deleteSeizedItem(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.deleteSeizedItem(id, userId);
  }

  // --- Medical Info ---
  @Post('medical')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add medical information to investigation' })
  addMedicalInfo(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMedicalInfoDto,
  ) {
    return this.profileService.addMedicalInfo(caseId, userId, {
      ...dto,
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null,
    });
  }

  @Patch('medical/:id')
  @ApiOperation({ summary: 'Update medical information record' })
  updateMedicalInfo(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMedicalInfoDto,
  ) {
    return this.profileService.updateMedicalInfo(id, userId, {
      ...dto,
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
    });
  }

  @Delete('medical/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete medical information record' })
  deleteMedicalInfo(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.deleteMedicalInfo(id, userId);
  }

  // --- Court Info ---
  @Post('court')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add court information to investigation' })
  addCourtInfo(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCourtInfoDto,
  ) {
    return this.profileService.addCourtInfo(caseId, userId, {
      ...dto,
      nextHearingDate: dto.nextHearingDate ? new Date(dto.nextHearingDate) : null,
      chargesheetFiledDate: dto.chargesheetFiledDate ? new Date(dto.chargesheetFiledDate) : null,
    });
  }

  @Patch('court/:id')
  @ApiOperation({ summary: 'Update court information record' })
  updateCourtInfo(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCourtInfoDto,
  ) {
    return this.profileService.updateCourtInfo(id, userId, {
      ...dto,
      nextHearingDate: dto.nextHearingDate ? new Date(dto.nextHearingDate) : undefined,
      chargesheetFiledDate: dto.chargesheetFiledDate ? new Date(dto.chargesheetFiledDate) : undefined,
    });
  }

  @Delete('court/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete court information record' })
  deleteCourtInfo(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.profileService.deleteCourtInfo(id, userId);
  }
}

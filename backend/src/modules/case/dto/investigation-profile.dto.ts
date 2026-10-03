import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertInvestigationProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() policeStation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() investigatingOfficer?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfRegistration?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() incidentDateTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incidentLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incidentDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() investigationNotes?: string;
}

export class CreateVictimDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() injuryDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class UpdateVictimDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() injuryDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class CreateAccusedDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() arrestStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bailDetails?: string;
}

export class UpdateAccusedDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() arrestStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bailDetails?: string;
}

export class CreateWitnessDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() statementDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() credibilityScore?: string;
}

export class UpdateWitnessDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() statementDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() credibilityScore?: string;
}

export class CreateVehicleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() make?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licensePlate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationState?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seizureStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() make?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licensePlate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationState?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seizureStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateSeizedItemDto {
  @ApiProperty() @IsString() itemName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seizureLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() seizureDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() officerInCharge?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class UpdateSeizedItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() itemName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seizureLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() seizureDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() officerInCharge?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class CreateMedicalInfoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() hospitalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() admissionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() injuryType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() medicalReportNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() treatmentDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() severity?: string;
}

export class UpdateMedicalInfoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() hospitalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() admissionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() injuryType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() medicalReportNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() treatmentDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() severity?: string;
}

export class CreateCourtInfoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() courtName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() judgeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextHearingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() chargesheetFiledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() judgementDetails?: string;
}

export class UpdateCourtInfoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() courtName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() judgeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextHearingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() chargesheetFiledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() judgementDetails?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateCaseMetadataDto {
  @ApiPropertyOptional({ example: '2026-09-01T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  incidentDate?: string;

  @ApiPropertyOptional({ example: '14:30' })
  @IsOptional()
  @IsString()
  incidentTime?: string;

  @ApiPropertyOptional({ example: 'Central Market, Sector 17' })
  @IsOptional()
  @IsString()
  incidentLocation?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  victimName?: string;

  @ApiPropertyOptional({ example: 'Statement given by the victim...' })
  @IsOptional()
  @IsString()
  victimStatement?: string;

  @ApiPropertyOptional({ example: 'Jane Smith' })
  @IsOptional()
  @IsString()
  suspectName?: string;

  @ApiPropertyOptional({ example: 'Tall, wearing a black jacket' })
  @IsOptional()
  @IsString()
  suspectDescription?: string;

  @ApiPropertyOptional({ example: 'Witness observed the suspect fleeing' })
  @IsOptional()
  @IsString()
  witnessInformation?: string;

  @ApiPropertyOptional({ example: 'Physical evidence recovered from scene' })
  @IsOptional()
  @IsString()
  evidenceSummary?: string;

  @ApiPropertyOptional({ example: 'Officer case notes' })
  @IsOptional()
  @IsString()
  officerNotes?: string;
}

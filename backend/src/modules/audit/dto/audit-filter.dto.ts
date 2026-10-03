import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export type AuditSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'HIGH';
export type AuditModuleType =
  | 'CASE'
  | 'DOCUMENT'
  | 'PERSON'
  | 'EVIDENCE'
  | 'CHECKLIST'
  | 'PROFILE'
  | 'DIAGNOSTICS'
  | 'SYSTEM';

export class AuditFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: AuditModuleType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: AuditSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isAi?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

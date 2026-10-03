import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { EvidenceType } from '@prisma/client';

export class CreateEvidenceDto {
  @ApiProperty({ example: 'Crime scene photograph' })
  @IsString()
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title!: string;

  @ApiProperty({ enum: EvidenceType, example: EvidenceType.IMAGE })
  @IsEnum(EvidenceType)
  type!: EvidenceType;

  @ApiPropertyOptional({ example: 'Photograph taken at the crime scene' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Chain of custody notes...' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'https://storage.s3/evidence-12.jpg' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'uploads/evidence/photo.jpg' })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 1024000 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ example: 1024000 })
  @IsOptional()
  @IsNumber()
  fileSizeBytes?: number;
}

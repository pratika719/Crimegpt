import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { EvidenceType } from '@/generated/prisma/client';

export class UpdateEvidenceDto {
  @ApiPropertyOptional({ example: 'Updated Evidence Title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: EvidenceType })
  @IsOptional()
  @IsEnum(EvidenceType)
  type?: EvidenceType;

  @ApiPropertyOptional({ example: 'Updated description...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Updated custody notes...' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'https://storage.s3/evidence-updated.jpg' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'uploads/evidence/updated.jpg' })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 2048000 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ example: 2048000 })
  @IsOptional()
  @IsNumber()
  fileSizeBytes?: number;
}

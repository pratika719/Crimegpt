import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class GenerateDocumentDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.FIR })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiPropertyOptional({ example: false, description: 'Force regeneration even if exists' })
  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean;
}

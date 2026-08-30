import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { CaseStatus } from '@/generated/prisma/client';

export class UpdateCaseDto {
  @ApiPropertyOptional({ example: 'Updated Case Title' })
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title?: string;

  @ApiPropertyOptional({ example: 'Updated narrative...' })
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'Narrative must be at least 20 characters' })
  @MaxLength(10000, { message: 'Narrative cannot exceed 10,000 characters' })
  narrative?: string;

  @ApiPropertyOptional({ enum: CaseStatus, example: CaseStatus.UNDER_INVESTIGATION })
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { PersonRole } from '@/generated/prisma/client';

export class UpdatePersonDto {
  @ApiPropertyOptional({ example: 'Updated Name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: PersonRole })
  @IsOptional()
  @IsEnum(PersonRole)
  role?: PersonRole;

  @ApiPropertyOptional({ example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main St, Mumbai' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Updated statement...' })
  @IsOptional()
  @IsString()
  statement?: string;

  @ApiPropertyOptional({ example: 'Updated notes...' })
  @IsOptional()
  @IsString()
  notes?: string;
}

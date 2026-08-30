import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { PersonRole } from '@/generated/prisma/client';

export class CreatePersonDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(200, { message: 'Name cannot exceed 200 characters' })
  name!: string;

  @ApiProperty({ enum: PersonRole, example: PersonRole.SUSPECT })
  @IsEnum(PersonRole)
  role!: PersonRole;

  @ApiPropertyOptional({ example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main St, Mumbai' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Witness statement...' })
  @IsOptional()
  @IsString()
  statement?: string;

  @ApiPropertyOptional({ example: 'Additional notes...' })
  @IsOptional()
  @IsString()
  notes?: string;
}

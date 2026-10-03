import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChecklistDto {
  @ApiProperty({ example: 'Secure crime scene perimeter', description: 'Task title' })
  @IsString()
  @MinLength(1, { message: 'Task title is required' })
  @MaxLength(300, { message: 'Task title cannot exceed 300 characters' })
  title!: string;
}

export class UpdateChecklistDto {
  @ApiPropertyOptional({ example: 'Secure perimeter and gather forensic samples' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

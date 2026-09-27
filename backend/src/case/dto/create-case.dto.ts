import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCaseDto {
  @ApiProperty({ example: 'Murder at Sector 5', description: 'Case title' })
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title!: string;

  @ApiProperty({
    example: 'A detailed narrative of the case...',
    description: 'Case narrative',
  })
  @IsString()
  @MinLength(20, { message: 'Narrative must be at least 20 characters' })
  @MaxLength(10000, { message: 'Narrative cannot exceed 10,000 characters' })
  narrative!: string;
}

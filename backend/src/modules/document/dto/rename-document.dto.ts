import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameDocumentDto {
  @ApiProperty({ example: 'FIR Report - Final Draft' })
  @IsString()
  @MinLength(1, { message: 'Document title is required' })
  @MaxLength(200, { message: 'Document title cannot exceed 200 characters' })
  title!: string;
}

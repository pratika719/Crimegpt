import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNumber, IsIn } from 'class-validator';

export class LogDocumentActivityDto {
  @ApiProperty({ example: 'DOWNLOAD', enum: ['DOWNLOAD', 'REGENERATE'] })
  @IsString()
  @IsIn(['DOWNLOAD', 'REGENERATE'])
  actionType!: 'DOWNLOAD' | 'REGENERATE';

  @ApiProperty({ example: 'FIR' })
  @IsString()
  @MinLength(1)
  docType!: string;

  @ApiProperty({ example: 'First Information Report' })
  @IsString()
  @MinLength(1)
  docTitle!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  version!: number;
}

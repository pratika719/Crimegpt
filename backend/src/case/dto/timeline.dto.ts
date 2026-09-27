import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTimelineEventDto {
  @ApiProperty({ example: 'Updated description of investigation timeline event' })
  @IsString()
  @MinLength(1, { message: 'Description is required' })
  @MaxLength(1000, { message: 'Description cannot exceed 1,000 characters' })
  description!: string;
}

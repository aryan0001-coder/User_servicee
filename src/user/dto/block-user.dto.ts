import { IsMongoId, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiProperty({
    description: 'ID of the user to be blocked',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  userId: string;

  @ApiPropertyOptional({
    description: 'ID of the user who blocked',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  blockedBy?: string;

  @ApiPropertyOptional({
    description: 'Date when the user was blocked',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  blockedAt?: Date;
}

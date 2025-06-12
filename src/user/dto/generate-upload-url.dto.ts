import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateUploadUrlDto {
  @ApiProperty({
    description: 'File type for the upload',
    example: 'image/jpeg',
    enum: ['image/jpeg', 'image/png', 'image/gif'],
  })
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/gif'])
  fileType: string;
}

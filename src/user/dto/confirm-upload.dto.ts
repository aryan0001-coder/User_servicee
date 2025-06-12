import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmUploadDto {
  @ApiProperty({
    description: 'Key of the uploaded image',
    example: 'profile-pic-12345.jpg',
  })
  @IsString()
  imageKey: string;
}

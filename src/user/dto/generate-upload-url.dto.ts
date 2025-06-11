import { IsString, IsIn } from 'class-validator';

export class GenerateUploadUrlDto {
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/gif'])
  fileType: string;
}

import { IsMongoId } from 'class-validator';

export class BlockUserDto {
  @IsMongoId()
  userId: string;

  blockedBy?: string;
  blockedAt?: Date;
}

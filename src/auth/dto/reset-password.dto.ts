import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email address of the user resetting the password',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'OTP sent to the user email for password reset',
    example: '123456',
  })
  @IsNotEmpty()
  otp: string;

  @ApiProperty({
    description: 'New password for the user account',
    example: 'newStrongPassword123',
  })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

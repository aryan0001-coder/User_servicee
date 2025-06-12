import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { User } from 'src/user/schemas/user.schema';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LogoutDto } from './dto/logout.dto';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    description: 'register user with certain fields',
  })
  @ApiResponse({ status: 201, description: 'User registered successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @ApiOperation({
    description: 'login user with email and password',
  })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponse> {
    console.log(loginDto);
    return this.authService.login(loginDto);
  }

  @Post('verify-otp')
  @ApiOperation({
    description: 'verify OTP sent to user email',
  })
  @ApiResponse({ status: 200, description: 'OTP verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid OTP.' })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Send OTP to user email for password reset',
    description:
      'Sends a one-time password (OTP) to the user email for password reset',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      example: {
        success: true,
        message: 'OTP sent to email for password reset',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      example: {
        success: false,
        message: 'User with this email does not exist',
      },
    },
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset user password using OTP',
    description:
      'Resets the user password after validating the OTP sent to email',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: { success: true, message: 'Password reset successfully' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      example: { success: false, message: 'Invalid OTP' },
    },
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout user by invalidating refresh token',
    description: 'Invalidates the refresh token to logout the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: { success: true, message: 'Logout successful' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      example: { success: false, message: 'Invalid token' },
    },
  })
  async logout(
    @Body() logoutDto: LogoutDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.logout(logoutDto.refreshToken);
  }
}

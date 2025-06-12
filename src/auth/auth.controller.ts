import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { User } from 'src/user/schemas/user.schema';
import { VerifyOtpDto } from './dto/verify-otp.dto';

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
}

// src/auth/auth.grpc.controller.ts
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/schemas/user.schema';
import { LoginDto } from './dto/login.dto';

interface LoginResponse {
  access_token: string;
  user: {
    id: any;
    email: string;
    name: string;
  };
}

interface LogoutResponse {
  success: boolean;
  message: string;
}

interface LogoutRequest {
  userId: string;
  deviceId: string;
  token?: string; // Optional token for validation
}

@Controller()
export class AuthGrpcController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'register')
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.authService.register(createUserDto);
  }
  @GrpcMethod('AuthService', 'Login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    console.log(loginDto);
    return this.authService.login(loginDto);
  }

  @GrpcMethod('AuthService', 'logout')
  async logout(@Body() data: LogoutRequest): Promise<LogoutResponse> {
    try {
      return await this.authService.logout(
        data.userId,
        data.deviceId,
        data.token,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to logout',
        error instanceof NotFoundException
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST,
      );
    }
  }
}

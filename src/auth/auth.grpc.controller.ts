import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../user/schemas/user.schema';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

@Controller()
export class AuthGrpcController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  async register(
    data: CreateUserDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginDto): Promise<TokenResponse> {
    console.log(data);
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'GenerateToken')
  async generateToken(data: any): Promise<TokenResponse> {
    // Implement token generation logic or call AuthService method
    // For example, you can call a method in AuthService to generate token
    // Here, assuming login method can be reused or create a new method in AuthService
    // Adjust as per your AuthService implementation

    // Example placeholder implementation:
    return this.authService.login(data);
  }
}

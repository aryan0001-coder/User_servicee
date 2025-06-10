import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from 'src/user/schemas/user.schema';

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
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @ApiOperation({
    description: 'login user with email and password',
  })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponse> {
    console.log(loginDto);
    return this.authService.login(loginDto);
  }
}

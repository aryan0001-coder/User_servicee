import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User } from '../user/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

interface LoginResponse {
  access_token: string;
  user: {
    id: any;
    email: string;
    name: string;
  };
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
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    console.log(loginDto);
    return this.authService.login(loginDto);
  }
}

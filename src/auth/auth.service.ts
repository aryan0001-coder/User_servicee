import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from '../user/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { User } from 'src/user/schemas/user.schema';
import { MailerService } from 'src/mailer/mailer.service';
import { RedisService } from 'src/redis/redis.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';

interface AuthServiceClient {
  GenerateToken(data: {
    userId: string;
    email: string;
    role: string;
    deviceId: string;
    ipAddress: string;
    userAgent: string;
  }): Observable<TokenResponse>;
}
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  private authService: AuthServiceClient;
  private readonly OTP_TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    @Inject('AUTH_PACKAGE') private readonly client: ClientGrpc,
    private readonly mailerService: MailerService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthServiceClient>('AuthService');
  }

  async register(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersService.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new UnauthorizedException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // Generate and send OTP
    const otp = await this.mailerService.sendOTP(newUser.email);

    // Store OTP in Redis with expiration
    await this.redisService.set(
      `otp:${newUser.email}`,
      otp,
      this.OTP_TTL_SECONDS,
    );

    return newUser;
  }

  async verifyOtp(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    const { email, otp } = verifyOtpDto;

    const storedOtp = await this.redisService.get(`otp:${email}`);

    if (!storedOtp) {
      return { success: false, message: 'OTP expired or not found' };
    }

    if (storedOtp !== otp) {
      return { success: false, message: 'Invalid OTP' };
    }

    // OTP is valid, delete it from Redis
    await this.redisService.del(`otp:${email}`);

    // Send welcome email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await this.mailerService.sendWelcomeEmailWithAttachment(
      user.email,
      user.username,
      '/path/to/Holiday_calendar1.pdf',
    );

    return { success: true, message: 'OTP verified and welcome email sent' };
  }

  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException(
        'User does not exist. Please register first.',
      );
    }

    if (user.isBanned) {
      throw new UnauthorizedException(
        user.banReason
          ? `Your account has been banned: ${user.banReason}`
          : 'Your account has been suspended. Please contact support.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };
    const UserId = user._id.toString();
    console.log(UserId);
    const token$ = this.authService.GenerateToken({
      userId: UserId,
      email: user.email,
      role: 'user',
      deviceId: 'test-device',
      ipAddress: '127.0.0.1',
      userAgent: 'PostmanRuntime/7.29.0',
    });

    const tokens = await lastValueFrom(token$);
    console.log(tokens);
    return tokens;
  }
}

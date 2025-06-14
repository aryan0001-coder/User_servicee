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
    fcmToken?: string;
  }): Observable<TokenResponse>;
}
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  private authService: AuthServiceClient;
  private readonly OTP_TTL_SECONDS = 300;

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

  async register(
    createUserDto: CreateUserDto,
  ): Promise<{ success: boolean; message: string }> {
    const existingUser = await this.usersService.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new UnauthorizedException('Email already in use');
    }

    const otp = await this.mailerService.sendOTP(createUserDto.email);

    await this.redisService.set(
      `otp:${createUserDto.email}`,
      otp,
      this.OTP_TTL_SECONDS,
    );
    await this.redisService.set(
      `user:${createUserDto.email}`,
      JSON.stringify(createUserDto),
      this.OTP_TTL_SECONDS,
    );

    return { success: true, message: 'OTP sent to email' };
  }

  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { success: false, message: 'User with this email does not exist' };
    }

    const otp = await this.mailerService.sendOTP(email);

    await this.redisService.set(
      `reset-password-otp:${email}`,
      otp,
      this.OTP_TTL_SECONDS,
    );

    return { success: true, message: 'OTP sent to email for password reset' };
  }

  async resetPassword(resetPasswordDto: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const { email, otp, newPassword } = resetPasswordDto;

    const storedOtp = await this.redisService.get(
      `reset-password-otp:${email}`,
    );

    if (!storedOtp) {
      return { success: false, message: 'OTP expired or not found' };
    }

    if (storedOtp !== otp) {
      return { success: false, message: 'Invalid OTP' };
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersService.update(user._id.toString(), {
      password: hashedPassword,
    });

    await this.redisService.del(`reset-password-otp:${email}`);

    return { success: true, message: 'Password reset successfully' };
  }

  async login(loginDto: LoginDto): Promise<TokenResponse> {
    console.log(`Login attempt for email: ${loginDto.email}`);

    const ftoken = loginDto.fcmToken;
    if (ftoken) {
      console.log(`Received FCM token: ${loginDto.fcmToken}`);
      // Optionally store or update the FCM token for the user here
      // For example, update user record or store in Redis
    }
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      console.log('User does not exist');
      throw new UnauthorizedException(
        'User does not exist. Please register first.',
      );
    }

    if (user.isBanned) {
      console.log('User is banned');
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
      console.log('Invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };
    const UserId = user._id.toString();
    console.log(`User ID: ${UserId}`);
    const token$ = this.authService.GenerateToken({
      userId: UserId,
      email: user.email,
      role: 'user',
      deviceId: 'test-device',
      ipAddress: '127.0.0.1',
      userAgent: 'PostmanRuntime/7.29.0',
      fcmToken: ftoken,
    });

    const tokens = await lastValueFrom(token$);
    console.log('Tokens generated');
    return tokens;
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

    await this.redisService.del(`otp:${email}`);

    const userDataString = await this.redisService.get(`user:${email}`);
    if (!userDataString) {
      return { success: false, message: 'User data expired or not found' };
    }
    const userData = JSON.parse(userDataString);

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = await this.usersService.create({
      ...userData,
      password: hashedPassword,
    });

    await this.redisService.del(`user:${email}`);

    await this.mailerService.sendWelcomeEmail(newUser.email, newUser.username);

    return {
      success: true,
      message: 'OTP verified and user registered with welcome email sent',
    };
  }

  async logout(
    refreshToken: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!refreshToken) {
      return { success: false, message: 'Invalid token' };
    }

    // Store the refresh token in Redis blacklist with expiration (e.g., 7 days)
    const BLACKLIST_PREFIX = 'blacklist:refresh-token:';
    const EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

    await this.redisService.set(
      `${BLACKLIST_PREFIX}${refreshToken}`,
      'true',
      EXPIRATION_SECONDS,
    );

    return { success: true, message: 'Logout successful' };
  }
}

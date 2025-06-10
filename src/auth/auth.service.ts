import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/schemas/user.schema';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

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

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
  ) {}

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

    return newUser;
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException(
        'User does not exist. Please register first.',
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
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'secret', // Use environment variable
      expiresIn: '30d',
    });

    // Store session with deviceId
    const deviceId = loginDto.deviceId || 'default-device'; // Assume deviceId is passed in LoginDto
    await this.userModel.findByIdAndUpdate(
      user.id,
      {
        $push: {
          sessions: {
            deviceId,
            token,
            lastActive: new Date(),
          },
        },
      },
      { new: true },
    );

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName || '',
      },
    };
  }

  async logout(
    userId: string,
    deviceId: string,
    token?: string,
  ): Promise<LogoutResponse> {
    try {
      if (!userId || !deviceId) {
        throw new UnauthorizedException('userId and deviceId are required');
      }

      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate token if provided (to ensure genuine user)
      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret: process.env.JWT_SECRET || 'secret',
          });
          if (payload.sub !== userId) {
            throw new UnauthorizedException('Invalid token for user');
          }
        } catch (error) {
          throw new UnauthorizedException('Invalid or expired token');
        }

        // Check if session exists with matching token and deviceId
        const session = user.sessions.find(
          (s) => s.deviceId === deviceId && s.token === token,
        );
        if (!session) {
          return {
            success: false,
            message: `No active session found for device ${deviceId} with provided token`,
          };
        }
      } else {
        // If no token is provided, check if session exists for deviceId
        const sessionExists = user.sessions.some(
          (s) => s.deviceId === deviceId,
        );
        if (!sessionExists) {
          return {
            success: false,
            message: `No active session found for device ${deviceId}`,
          };
        }
      }

      // Remove session
      await this.userModel.findByIdAndUpdate(
        userId,
        {
          $pull: {
            sessions: { deviceId },
          },
        },
        { new: true },
      );

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new Error(`Logout failed: ${error.message}`);
    }
  }
}

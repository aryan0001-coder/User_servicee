import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import { QueryUserDto } from './dto/query-user.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsCredentialIdentity } from '@aws-sdk/types';

@Injectable()
export class UserService {
  private readonly s3Client: S3Client;
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_KEY');

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are not properly configured');
    }

    const credentials: AwsCredentialIdentity = {
      accessKeyId,
      secretAccessKey,
    };

    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials,
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const existingUser = await this.userModel.findOne({
        $or: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      });

      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      const newUser = new this.userModel({
        ...createUserDto,
        followers: [],
        following: [],
      });

      //after creating a new user this will call notification service through grpc

      return await newUser.save();
    } catch (error) {
      if (error.message.includes('email or username already exists')) {
        throw new ConflictException(
          'User with this email or username already exists',
        );
      }
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ users: User[]; totalCount: number }> {
    try {
      const skip = (page - 1) * limit;

      const users = await this.userModel
        .find()
        .select('-password')
        .skip(skip)
        .limit(limit)
        .exec();

      const totalCount = await this.userModel.countDocuments();

      return { users, totalCount };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async validateUser(
    id: string,
  ): Promise<{ isValid: boolean; isBanned?: boolean }> {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        return { isValid: false };
      }

      // Return both validation and banned status
      return {
        isValid: true,
        isBanned: user.isBanned,
      };
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  async search(
    queryUserDto: QueryUserDto,
  ): Promise<{ users: User[]; totalCount: number }> {
    try {
      const { query = '', page = 1 } = queryUserDto;
      const limit = 10;
      const skip = (page - 1) * limit;

      const searchRegex = new RegExp(query, 'i');

      const users = await this.userModel
        .find({
          $or: [
            { username: searchRegex },
            { fullName: searchRegex },
            { email: searchRegex },
          ],
        })
        .select('-password')
        .skip(skip)
        .limit(limit)
        .exec();

      const totalCount = await this.userModel.countDocuments({
        $or: [
          { username: searchRegex },
          { fullName: searchRegex },
          { email: searchRegex },
        ],
      });

      return { users, totalCount };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const user = await this.userModel.findById(id).select('-password');
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Find user failed: ${error.message}`);
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne({ email }).exec();
    } catch (error) {
      throw new Error(`Find user by email failed: ${error.message}`);
    }
  }

  async findByUsername(username: string): Promise<User> {
    try {
      const user = await this.userModel
        .findOne({ username })
        .select('-password');
      if (!user) {
        throw new NotFoundException(`User with username ${username} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Find user by username failed: ${error.message}`);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateUserDto, { new: true })
        .select('-password');

      if (!updatedUser) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Update user failed: ${error.message}`);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.userModel.deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Delete user failed: ${error.message}`);
    }
  }

  async follow(userId: string, targetId: string): Promise<User> {
    try {
      if (userId === targetId) {
        throw new BadRequestException('Users cannot follow themselves');
      }

      const session = await this.userModel.startSession();
      session.startTransaction();

      try {
        const [user, targetUser] = await Promise.all([
          this.userModel.findById(userId).session(session),
          this.userModel.findById(targetId).session(session),
        ]);

        if (!user || !targetUser) {
          throw new NotFoundException(`One or both users not found`);
        }

        if (user.following.includes(targetId)) {
          throw new ConflictException('Already following this user');
        }

        await this.userModel
          .findByIdAndUpdate(
            userId,
            {
              $addToSet: { following: targetId },
            },
            { new: true, session },
          )
          .select('-password');

        await this.userModel.findByIdAndUpdate(
          targetId,
          {
            $addToSet: { followers: userId },
            $inc: { followersCount: 1 },
          },
          { session },
        );

        await session.commitTransaction();
        return user;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Follow user failed: ${error.message}`);
    }
  }

  async unfollow(userId: string, targetId: string): Promise<User> {
    try {
      const user = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $pull: { following: targetId } },
          { new: true },
        )
        .select('-password');

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      await this.userModel.findByIdAndUpdate(targetId, {
        $pull: { followers: userId },
        $inc: { followersCount: -1 },
      });

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Unfollow user failed: ${error.message}`);
    }
  }

  async getFollowers(
    userId: string,
    page = 1,
  ): Promise<{ users: User[]; totalCount: number }> {
    try {
      const limit = 10;
      const skip = (page - 1) * limit;

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      const followers = await this.userModel
        .find({ _id: { $in: user.followers } })
        .select('-password')
        .skip(skip)
        .limit(limit);

      const totalCount = user.followers.length;

      return { users: followers, totalCount };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Get followers failed: ${error.message}`);
    }
  }

  async getFollowing(
    userId: string,
    page = 1,
  ): Promise<{ users: User[]; totalCount: number }> {
    try {
      const limit = 10;
      const skip = (page - 1) * limit;

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      const following = await this.userModel
        .find({ _id: { $in: user.following } })
        .select('-password')
        .skip(skip)
        .limit(limit);

      const totalCount = user.following.length;

      return { users: following, totalCount };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Get following failed: ${error.message}`);
    }
  }

  async blockUser(
    currentUserId: string,
    blockUserDto: BlockUserDto,
  ): Promise<User | null> {
    try {
      const { userId } = blockUserDto;

      const userToBlock = await this.userModel.findById(userId);
      if (!userToBlock) {
        throw new NotFoundException('User to block not found');
      }

      const currentUser = await this.userModel.findById(currentUserId);
      if (!currentUser) {
        throw new NotFoundException('Current user not found');
      }

      if (currentUser.blockedUsers.includes(userId)) {
        return currentUser;
      }

      return await this.userModel
        .findByIdAndUpdate(
          currentUserId,
          { $addToSet: { blockedUsers: userId } },
          { new: true },
        )
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Block user failed: ${error.message}`);
    }
  }

  async unblockUser(
    currentUserId: string,
    blockUserDto: BlockUserDto,
  ): Promise<User | null> {
    try {
      const { userId } = blockUserDto;

      const userToUnblock = await this.userModel.findById(userId);
      if (!userToUnblock) {
        throw new NotFoundException('User to unblock not found');
      }

      const currentUser = await this.userModel.findById(currentUserId);
      if (!currentUser) {
        throw new NotFoundException('Current user not found');
      }

      return await this.userModel
        .findByIdAndUpdate(
          currentUserId,
          { $pull: { blockedUsers: userId } },
          { new: true },
        )
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Unblock user failed: ${error.message}`);
    }
  }

  async banUser(userId: string, banUserDto: BanUserDto): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          isBanned: true,
          banReason: banUserDto.reason,
        },
      },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async unbanUser(userId: string): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          isBanned: false,
          banReason: null,
        },
      },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getBannedUsers(): Promise<User[]> {
    return this.userModel.find({ isBanned: true }).exec();
  }
  async generatePresignedUrl(
    userId: string,
    fileType: string,
  ): Promise<{ url: string; key: string }> {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(fileType)) {
      throw new BadRequestException(
        'Invalid file type. Supported types: jpeg, png, gif',
      );
    }

    const fileExtension = fileType.split('/')[1];
    const key = `user-uploads/profile-pictures/${userId}-${Date.now()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET_NAME'),
      Key: key,
      ContentType: fileType,
      ACL: 'public-read', // Adjust to 'private' if access control is needed
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      }); // 1-hour expiry
      return { url, key };
    } catch (error) {
      throw new BadRequestException('Failed to generate presigned URL');
    }
  }

  async updateProfilePicture(userId: string, imageKey: string): Promise<User> {
    const imageUrl = `https://${this.configService.get('AWS_S3_BUCKET_NAME')}.s3.amazonaws.com/${imageKey}`;

    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { profilePicture: imageUrl },
        { new: true, runValidators: true },
      );
      if (!updatedUser) {
        throw new BadRequestException('User not found');
      }
      return updatedUser;
    } catch (error) {
      throw new BadRequestException('Failed to update profile picture');
    }
  }
}
